require('dotenv').config();
const winston = require('winston');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const puppeteerLib = require('puppeteer');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Logger (winston)
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'whatsapp-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'whatsapp-combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

function safeLogArg(value) {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, Object.getOwnPropertyNames(value));
        } catch {
            try {
                return JSON.stringify(value);
            } catch {
                return '[object]';
            }
        }
    }
    return String(value);
}

// Redirect console to logger for structured logs
console.log = (...args) => logger.info(args.map(safeLogArg).join(' '));
console.info = console.log;
console.warn = (...args) => logger.warn(args.map(safeLogArg).join(' '));
console.error = (...args) => logger.error(args.map(safeLogArg).join(' '));

// Serve static assets
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variable is required. Check whatsapp-service/.env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const circuitBreakers = new Map();
const inFlightMessages = new Set();
const recentlyHandledInboundEvents = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000;

// Multiple WhatsApp instances management
const whatsappInstances = new Map();
const activeQRCodes = new Map();

function getCircuitState(instanceId) {
    const current = circuitBreakers.get(instanceId);
    if (!current) {
        return { failures: 0, openUntil: 0 };
    }
    if (current.openUntil && Date.now() > current.openUntil) {
        const reset = { failures: 0, openUntil: 0 };
        circuitBreakers.set(instanceId, reset);
        return reset;
    }
    return current;
}

function isCircuitOpen(instanceId) {
    const state = getCircuitState(instanceId);
    return state.openUntil && state.openUntil > Date.now();
}

function registerCircuitFailure(instanceId) {
    const state = getCircuitState(instanceId);
    const failures = (state.failures || 0) + 1;
    const nextState = {
        failures,
        openUntil: failures >= CIRCUIT_BREAKER_THRESHOLD ? (Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS) : 0
    };
    circuitBreakers.set(instanceId, nextState);

    if (nextState.openUntil) {
        console.error(`Circuit breaker OPEN for instance ${instanceId} until ${new Date(nextState.openUntil).toISOString()}`);
    }
}

function registerCircuitSuccess(instanceId) {
    circuitBreakers.set(instanceId, { failures: 0, openUntil: 0 });
}

async function syncConnectedStatus(instanceId, phoneNumber = null) {
    try {
        const updates = {
            status: 'connected',
            qr_code: null,
            updated_at: new Date().toISOString()
        };

        if (phoneNumber) {
            updates.phone_number = phoneNumber;
        }

        await supabase
            .from('whatsapp_instances')
            .update(updates)
            .eq('id', instanceId);
    } catch (error) {
        console.error(`Failed to sync connected status for ${instanceId}:`, error);
    }
}

function resolveBrowserExecutable() {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p)) return p;
        } catch {}
    }
    try {
        return puppeteerLib.executablePath();
    } catch {
        return undefined;
    }
}

const BROWSER_PATH = resolveBrowserExecutable();
console.log(`Using browser executable: ${BROWSER_PATH || 'default (puppeteer)'}`);

async function restoreActiveInstances() {
    try {
        const { data: instances, error } = await supabase
            .from('whatsapp_instances')
            .select('id, name, status')
            .in('status', ['connected', 'connecting']);

        if (error) {
            throw error;
        }

        for (const instance of instances || []) {
            if (whatsappInstances.has(instance.id)) {
                continue;
            }

            console.log(`Restoring WhatsApp instance ${instance.name || instance.id}`);

            const client = createWhatsAppClient(instance.id, instance.name);
            whatsappInstances.set(instance.id, client);

            try {
                await supabase
                    .from('whatsapp_instances')
                    .update({
                        status: 'connecting',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', instance.id);
            } catch (updateError) {
                console.error(`Failed to update status while restoring ${instance.id}:`, updateError);
            }

            client.initialize().catch((e) => {
                console.error(`Failed to initialize client during restore for ${instance.id}`, e);
            });
        }
    } catch (error) {
        console.error('Failed to restore WhatsApp instances on startup:', error);
    }
}

// Subscribe to outgoing messages
async function markFailedWithRetry(msg, reason) {
    const currentRetry = Number(msg.retry_count || 0);
    const nextRetry = currentRetry + 1;
    const shouldDeadLetter = nextRetry >= 3;
    const retryDelaySeconds = Math.min(120, 10 * nextRetry);
    const nextRetryAt = shouldDeadLetter ? null : new Date(Date.now() + retryDelaySeconds * 1000).toISOString();

    try {
        await supabase
            .from('whatsapp_messages')
            .update({
                status: shouldDeadLetter ? 'failed' : 'failed',
                retry_count: nextRetry,
                last_error: reason,
                error_message: reason,
                dead_letter: shouldDeadLetter,
                failed_at: new Date().toISOString(),
                next_retry_at: nextRetryAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', msg.id);

        if (shouldDeadLetter) {
            console.error(`Message ${msg.id} moved to dead-letter after ${nextRetry} attempts`);
        }
    } catch (error) {
        console.error(`Failed to mark message ${msg.id} with retry metadata:`, error);
    }
}

// Normalize Brazilian phone numbers – try with and without the 9th digit
function normalizeBrazilianPhone(phone) {
    // Strip everything non-digit
    const digits = phone.replace(/\D/g, '');

    // Brazilian mobile: 55 + 2-digit area code + 9-digit number = 13 digits
    // Some older contacts are stored without the leading 9 (12 digits)
    if (digits.startsWith('55') && digits.length === 13) {
        // Already has the 9th digit – also produce variant without it
        const withoutNinth = digits.slice(0, 4) + digits.slice(5); // remove the 9 after area code
        return { primary: digits, variants: [withoutNinth] };
    }
    if (digits.startsWith('55') && digits.length === 12) {
        // Missing the 9th digit – add it
        const withNinth = digits.slice(0, 4) + '9' + digits.slice(4);
        return { primary: digits, variants: [withNinth] };
    }
    return { primary: digits, variants: [] };
}

function extractWhatsAppUser(rawId) {
    const user = String(rawId || '').split('@')[0] || '';
    return user.replace(/\D/g, '');
}

function shouldHandleInboundEvent(messageId) {
    if (!messageId) return false;
    const now = Date.now();
    for (const [id, handledAt] of recentlyHandledInboundEvents.entries()) {
        if (now - handledAt > 5 * 60 * 1000) {
            recentlyHandledInboundEvents.delete(id);
        }
    }
    if (recentlyHandledInboundEvents.has(messageId)) {
        return false;
    }
    recentlyHandledInboundEvents.set(messageId, now);
    return true;
}

function normalizeWhatsAppSendError(error) {
    const raw = error?.message || String(error || 'Send failed');
    const lowered = raw.toLowerCase();
    if (lowered.includes('markedunread') || lowered.includes('sendseen')) {
        return 'Falha temporaria no WhatsApp Web ao atualizar status da conversa. Tente reenviar em alguns segundos.';
    }
    return raw;
}

async function processOutgoingMessage(msg) {
    if (!msg || !msg.instance_id || !msg.id) return;

    if (inFlightMessages.has(msg.id)) {
        return;
    }

    inFlightMessages.add(msg.id);
    let claimed = false;

    try {
        const nowIso = new Date().toISOString();
        let claimQuery = supabase
            .from('whatsapp_messages')
            .update({
                status: 'sending',
                updated_at: nowIso
            })
            .eq('id', msg.id)
            .neq('dead_letter', true)
            .in('status', ['pending', 'failed']);

        if (msg.status === 'failed') {
            claimQuery = claimQuery.lte('next_retry_at', nowIso);
        }

        const { data: claimData, error: claimError } = await claimQuery
            .select('id');

        if (claimError) {
            console.error(`Failed to claim message ${msg.id} for processing:`, claimError);
            return;
        }

        if (!claimData || claimData.length === 0) {
            return;
        }

        claimed = true;

    } catch (claimException) {
        console.error(`Unexpected claim error for message ${msg.id}:`, claimException);
        return;
    }

    if (!claimed) {
        inFlightMessages.delete(msg.id);
        return;
    }

    try {
        const { data: latestMessage, error: latestMessageError } = await supabase
            .from('whatsapp_messages')
            .select('id, status, whatsapp_message_id')
            .eq('id', msg.id)
            .maybeSingle();

        if (latestMessageError) {
            console.error(`Failed to reload claimed message ${msg.id}:`, latestMessageError);
        } else if (latestMessage?.whatsapp_message_id) {
            await supabase
                .from('whatsapp_messages')
                .update({
                    status: 'sent',
                    retry_count: 0,
                    next_retry_at: null,
                    dead_letter: false,
                    failed_at: null,
                    last_error: null,
                    error_message: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', msg.id);

            registerCircuitSuccess(msg.instance_id);
            console.log(`Skipping resend for ${msg.id} because whatsapp_message_id already exists (${latestMessage.whatsapp_message_id})`);
            inFlightMessages.delete(msg.id);
            return;
        }
    } catch (reloadError) {
        console.error(`Unexpected reload error for message ${msg.id}:`, reloadError);
    }

    if (isCircuitOpen(msg.instance_id)) {
        const state = getCircuitState(msg.instance_id);
        const waitMs = Math.max(0, state.openUntil - Date.now());
        console.warn(`Skipping message ${msg.id} because circuit is open for ${msg.instance_id}. Retry in ${Math.ceil(waitMs / 1000)}s`);
        await markFailedWithRetry(msg, 'Circuit breaker open');
        inFlightMessages.delete(msg.id);
        return;
    }

    try {
        const client = whatsappInstances.get(msg.instance_id);
        if (!client) {
            await markFailedWithRetry(msg, 'Instance not found');
            registerCircuitFailure(msg.instance_id);
            return;
        }

        if (!client.info || !client.info.wid) {
            await markFailedWithRetry(msg, 'Instance not connected');
            registerCircuitFailure(msg.instance_id);
            return;
        }

        const { data: conversation, error: convError } = await supabase
            .from('whatsapp_conversations')
            .select('customer_phone, whatsapp_number')
            .eq('id', msg.conversation_id)
            .single();

        if (convError || !conversation) {
            await markFailedWithRetry(msg, 'Conversation not found');
            // Not an instance-level failure – don't trip circuit breaker
            return;
        }

        const phoneNumber = conversation.customer_phone || conversation.whatsapp_number;
        if (!phoneNumber) {
            await markFailedWithRetry(msg, 'Conversation has no phone number');
            return;
        }

        // Normalize and resolve the WhatsApp ID using getNumberId
        const { primary, variants } = normalizeBrazilianPhone(phoneNumber);
        // Candidate order: try original, then variant(s) without/with 9th digit.
        const candidates = [primary, ...variants].filter(Boolean);
        let resolvedId = null;
        let acceptedVariant = null;

        for (const candidate of candidates) {
            // try both with @c.us and plain number to be robust
            const attempts = [`${candidate}@c.us`, candidate];
            for (const attempt of attempts) {
                try {
                    const numberId = await client.getNumberId(attempt);
                    if (numberId) {
                        resolvedId = numberId._serialized;
                        acceptedVariant = attempt;
                        console.log(`Resolved ${candidate} (attempt: ${attempt}) -> ${resolvedId}`);
                        break;
                    }
                } catch (e) {
                    console.warn(`getNumberId failed for ${attempt}:`, e && e.message ? e.message : e);
                }
            }
            if (resolvedId) break;
        }

        if (acceptedVariant) {
            console.log(`Phone resolution accepted variant: ${acceptedVariant} (original: ${primary})`);
        }

        if (!resolvedId) {
            // Number is not registered on WhatsApp – permanent failure, no retry
            const errorMsg = `Número ${primary} não está registrado no WhatsApp`;
            console.error(errorMsg);
            await supabase
                .from('whatsapp_messages')
                .update({
                    status: 'failed',
                    dead_letter: true,
                    last_error: errorMsg,
                    error_message: errorMsg,
                    failed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', msg.id);
            // Not an instance failure – don't trip circuit breaker
            return;
        }

        const resolvedUser = extractWhatsAppUser(resolvedId);
        if (resolvedUser && msg.conversation_id) {
            await supabase
                .from('whatsapp_conversations')
                .update({ whatsapp_number: resolvedUser, updated_at: new Date().toISOString() })
                .eq('id', msg.conversation_id);
        }

        let sentMessage;

        if (msg.media_url) {
            const media = await MessageMedia.fromUrl(msg.media_url);
            if (msg.file_name) media.filename = msg.file_name;
            sentMessage = await client.sendMessage(resolvedId, media, { caption: msg.content || '', sendSeen: false });
        } else {
            sentMessage = await client.sendMessage(resolvedId, msg.content || '', { sendSeen: false });
        }

        await supabase
            .from('whatsapp_messages')
            .update({
                status: 'sent',
                whatsapp_message_id: sentMessage?.id?._serialized || msg.whatsapp_message_id || null,
                retry_count: 0,
                next_retry_at: null,
                dead_letter: false,
                last_error: null,
                error_message: null,
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', msg.id);

        registerCircuitSuccess(msg.instance_id);
        console.log(`Message ${msg.id} sent successfully to ${resolvedId}`);
    } catch (error) {
        const reason = normalizeWhatsAppSendError(error);
        console.error(`Failed to send message ${msg.id}:`, reason);

        // Only trip circuit breaker for instance-level errors (not per-number)
        const isInstanceError = reason.includes('not connected') ||
            reason.includes('Instance not found') ||
            reason.includes('ECONNREFUSED') ||
            reason.includes('Protocol error');

        await markFailedWithRetry(msg, reason);
        if (isInstanceError) {
            registerCircuitFailure(msg.instance_id);
        }
    } finally {
        inFlightMessages.delete(msg.id);
    }
}

function subscribeToOutgoingMessages() {
    console.log('========================================');
    console.log('SUBSCRIBING TO OUTGOING MESSAGES...');
    console.log('========================================');
    const channel = supabase
        .channel('whatsapp-outgoing')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: 'status=eq.pending'
            },
            async (payload) => {
                console.log('========================================');
                console.log('NEW OUTGOING MESSAGE DETECTED!');
                console.log('Message ID:', payload.new.id);
                console.log('Instance ID:', payload.new.instance_id);
                console.log('Content:', payload.new.content);
                console.log('Media URL:', payload.new.media_url);
                console.log('========================================');
                const msg = payload.new;
                await processOutgoingMessage(msg);
            }
        )
        .subscribe((status) => {
            console.log('========================================');
            console.log('SUBSCRIPTION STATUS:', status);
            console.log('========================================');
            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to outgoing messages!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Channel error - subscription failed');
            } else if (status === 'TIMED_OUT') {
                console.error('⏱️ Subscription timed out');
            } else if (status === 'CLOSED') {
                console.warn('🔒 Subscription closed');
            }
        });
}

function startRetryWorker() {
    setInterval(async () => {
        try {
            const nowIso = new Date().toISOString();

            const { data: pendingMessages, error: pendingError } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(20);

            if (pendingError) {
                console.error('Retry worker failed to fetch pending messages:', pendingError);
                return;
            }

            const { data: failedMessages, error: failedError } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('status', 'failed')
                .eq('dead_letter', false)
                .lte('next_retry_at', nowIso)
                .order('updated_at', { ascending: true })
                .limit(20);

            if (failedError) {
                console.error('Retry worker failed to fetch failed messages:', failedError);
                return;
            }

            const messages = [...(pendingMessages || []), ...(failedMessages || [])];

            for (const msg of messages || []) {
                await processOutgoingMessage(msg);
            }
        } catch (error) {
            console.error('Retry worker crashed:', error);
        }
    }, 30000);
}

async function updateMessageStatus(messageId, status, errorMessage = null) {
    try {
        await supabase
            .from('whatsapp_messages')
            .update({ 
                status: status,
                error_message: errorMessage, // Assuming this column exists or we ignore it if not
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId);
    } catch (error) {
        console.error(`Failed to update message status for ${messageId}:`, error);
    }
}

async function persistIncomingMessageFallback(instanceId, message) {
    try {
        const fromJid = String(message?.from || '').toLowerCase();
        if (!fromJid || fromJid.includes('@g.us') || fromJid.includes('@broadcast') || fromJid.includes('status@')) {
            return;
        }

        const messageId = message?.id?._serialized;
        if (!messageId) return;

        const { data: existingMsg } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('whatsapp_message_id', messageId)
            .limit(1);

        if (existingMsg && existingMsg.length > 0) {
            return;
        }

        const phoneDigits = (fromJid.split('@')[0] || '').replace(/\D/g, '');
        if (!phoneDigits) return;

        const { data: existingConversation, error: existingConvError } = await supabase
            .from('whatsapp_conversations')
            .select('id, unread_count')
            .eq('instance_id', instanceId)
            .or(`customer_phone.eq.${phoneDigits},whatsapp_number.eq.${phoneDigits}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingConvError) {
            console.error('Fallback inbound failed to query conversation:', existingConvError);
            return;
        }

        let conversationId = existingConversation?.id;
        if (!conversationId) {
            const { data: createdConversation, error: createConvError } = await supabase
                .from('whatsapp_conversations')
                .insert({
                    instance_id: instanceId,
                    customer_phone: phoneDigits,
                    whatsapp_number: phoneDigits,
                    customer_name: phoneDigits,
                    status: 'active',
                    unread_count: 1,
                    last_message: message.body || null,
                    last_message_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (createConvError) {
                console.error('Fallback inbound failed to create conversation:', createConvError);
                return;
            }

            conversationId = createdConversation?.id;
        } else {
            await supabase
                .from('whatsapp_conversations')
                .update({
                    status: 'active',
                    closed_at: null,
                    closed_reason: null,
                    last_message: message.body || null,
                    last_message_at: new Date().toISOString(),
                    unread_count: Number(existingConversation?.unread_count || 0) + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
        }

        if (!conversationId) return;

        const { error: insertMsgError } = await supabase
            .from('whatsapp_messages')
            .insert({
                conversation_id: conversationId,
                instance_id: instanceId,
                sender_type: 'customer',
                content: message.body || '',
                message_type: message.type || 'text',
                status: 'received',
                whatsapp_message_id: messageId,
            });

        if (insertMsgError) {
            console.error('Fallback inbound failed to insert message:', insertMsgError);
            return;
        }

        console.log(`Inbound fallback persisted message ${messageId} for ${phoneDigits}`);
    } catch (error) {
        console.error('Inbound fallback crashed:', error);
    }
}

async function handleIncomingMessage(instanceId, client, message) {
    try {
        if (!message) return;

        const fromMe = !!message.fromMe;
        const fromJid = String(message.from || '').toLowerCase();
        const toJid = String(message.to || '').toLowerCase();

        // Ignora grupos, broadcasts e status
        if (
            fromJid.includes('@g.us') || toJid.includes('@g.us') ||
            fromJid.includes('@broadcast') || toJid.includes('@broadcast') ||
            fromJid.includes('status@') || toJid.includes('status@')
        ) {
            return;
        }

        // Identifica a contraparte (cliente). Para fromMe, é o destinatário.
        const counterpartyJid = fromMe ? toJid : fromJid;
        if (!counterpartyJid) return;

        // Self-skip APENAS quando a contraparte for IGUAL ao próprio número da instância
        // (caso raro de auto-conversa). Comparar dígitos puros, não substring.
        try {
            const instanceUser = client?.info?.wid?.user;
            const counterDigits = counterpartyJid.split('@')[0].replace(/\D/g, '');
            if (instanceUser && counterDigits === String(instanceUser).replace(/\D/g, '')) {
                console.log(`[${instanceId}] Skipping self-conversation message`);
                return;
            }
        } catch (e) {
            console.error('Error checking instance number for self-skip:', e);
        }

        const messageId = message?.id?._serialized;
        if (!messageId) {
            console.log(`[${instanceId}] Message without id, skipping`);
            return;
        }

        console.log(`[${instanceId}] ${fromMe ? 'OUT' : 'IN '} from=${fromJid} to=${toJid} msgId=${messageId} body="${(message.body || '').slice(0, 60)}"`);

        if (!shouldHandleInboundEvent(messageId)) {
            console.log(`[${instanceId}] Skipping duplicate local event ${messageId}`);
            return;
        }

        if (fromMe) {
            try {
                const { data: existing, error: existError } = await supabase
                    .from('whatsapp_messages')
                    .select('id')
                    .eq('whatsapp_message_id', messageId)
                    .limit(1);

                if (existError) {
                    console.error('Error checking existing sent whatsapp_message_id:', existError);
                } else if (existing && existing.length > 0) {
                    return;
                }
            } catch (err) {
                console.error('Unexpected error during sent-message dedup check:', err);
            }
        }

        console.log(`Message received from ${message.from} on instance ${instanceId}: ${message.body || '[media/no-text]'}`);

        try {
            const headers = {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            };

            if (process.env.WHATSAPP_WEBHOOK_SECRET) {
                headers['x-webhook-secret'] = process.env.WHATSAPP_WEBHOOK_SECRET;
            }

            await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
                instance_id: instanceId,
                from: message.from,
                to: message.to,
                fromMe,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
                messageId,
            }, { headers, timeout: 15000 });

            console.log(`[${instanceId}] ✓ Forwarded to webhook (fromMe=${fromMe})`);
        } catch (error) {
            if (error && error.response) {
                try {
                    console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`);
                } catch (e) {
                    console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}: response status=${error.response.status}`);
                }
            } else {
                console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}:`, error);
            }

            await persistIncomingMessageFallback(instanceId, message);
        }
    } catch (error) {
        console.error('handleIncomingMessage crashed:', error);
    }
}

// Function to create a new WhatsApp client instance
function createWhatsAppClient(instanceId, instanceName = null) {
    // Sanitize instanceId for use in file paths and clientId (remove hyphens from UUIDs)
    const sanitizedId = instanceId.replace(/-/g, '');
    console.log(`Sanitized ID for LocalAuth: ${sanitizedId}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: `./whatsapp-session-${sanitizedId}`
        }),
        // webVersionCache: {
        //     type: 'local'
        // },
        // takeoverOnConflict: true,
        // authTimeoutMs: 120000,
        puppeteer: {
            headless: true,
            executablePath: BROWSER_PATH,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        },
        // qrMaxRetries: 10,
        // restartOnAuthFail: false
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`Instance ${instanceId} loading ${percent}% - ${message}`);
    });

    client.on('change_state', (state) => {
        console.log(`Instance ${instanceId} state changed: ${state}`);

        // Some sessions authenticate without emitting 'ready'.
        // When WA state reaches CONNECTED, force DB status reconciliation.
        if (state === 'CONNECTED') {
            const connectedNumber = client.info?.wid?.user || null;
            activeQRCodes.delete(instanceId);
            syncConnectedStatus(instanceId, connectedNumber);
        }
    });

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log(`QR Code received for instance ${instanceId}`);

        // Generate terminal QR code with instance identifier
        console.log(`=== QR CODE FOR INSTANCE ${instanceId} ===`);
        qrcode.generate(qr, { small: true });
        console.log(`=== END QR CODE FOR INSTANCE ${instanceId} ===`);

        activeQRCodes.set(instanceId, qr);

        // Save QR Code to Supabase
        try {
            const upsertData = {
                id: instanceId,
                qr_code: qr,
                status: 'connecting',
                updated_at: new Date().toISOString()
            };

            if (instanceName) {
                upsertData.name = instanceName;
            }

            const result = await supabase
                .from('whatsapp_instances')
                .upsert(upsertData, {
                    onConflict: 'id'
                });

            if (result.error) {
                console.error(`Supabase error for instance ${instanceId}:`, result.error);
            } else {
                console.log(`QR Code saved to Supabase successfully for instance ${instanceId}`);
            }
        } catch (error) {
            console.error(`Failed to save QR Code to Supabase for instance ${instanceId}:`, error);
        }
    });

    client.on('authenticated', () => {
        console.log(`Instance ${instanceId} authenticated event fired`);

        // Keep UI consistent even if 'ready' does not fire on this runtime.
        const connectedNumber = client.info?.wid?.user || null;
        activeQRCodes.delete(instanceId);
        syncConnectedStatus(instanceId, connectedNumber);
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log(`WhatsApp client is ready for instance ${instanceId}!`);

        // Update connection status in Supabase
        try {
            const connectedNumber = client.info?.wid?.user || 'unknown';
            await syncConnectedStatus(instanceId, connectedNumber);
            console.log(`WhatsApp connected with number: ${connectedNumber} for instance ${instanceId}`);

            // Remove QR code from active list
            activeQRCodes.delete(instanceId);
        } catch (error) {
            console.error(`Failed to update connection status in Supabase for instance ${instanceId}:`, error);
        }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
        console.log(`WhatsApp client disconnected for instance ${instanceId}:`, reason);
        activeQRCodes.delete(instanceId);

        // Update status in Supabase
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'reconnecting',
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`Disconnection status updated in Supabase for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to update disconnection status in Supabase for instance ${instanceId}:`, error);
        }

        // Reconnection Logic
        console.log(`Attempting to reconnect instance ${instanceId} in 5 seconds...`);
        setTimeout(async () => {
            try {
                // Destroy old client if it exists
                if (whatsappInstances.has(instanceId)) {
                    const oldClient = whatsappInstances.get(instanceId);
                    try { await oldClient.destroy(); } catch (e) { console.error('Error destroying old client:', e); }
                    whatsappInstances.delete(instanceId);
                }

                // Create and initialize new client
                console.log(`Recreating client for instance ${instanceId}...`);
                const newClient = createWhatsAppClient(instanceId, instanceName);
                whatsappInstances.set(instanceId, newClient);
                
                newClient.initialize().catch(e => {
                    console.error(`Failed to re-initialize client for ${instanceId}:`, e);
                });
            } catch (err) {
                console.error(`Critical error during reconnection for ${instanceId}:`, err);
            }
        }, 5000);
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error(`Authentication failed for instance ${instanceId}:`, msg);
        activeQRCodes.delete(instanceId);

        // Clear session and force new QR
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    phone_number: null,
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`Authentication failure status updated in Supabase for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to update auth failure status in Supabase for instance ${instanceId}:`, error);
        }
    });

    // 'message_create' cobre mensagens enviadas (fromMe). 'message' cobre respostas recebidas.
    // O dedup local por messageId evita processamento duplo quando a lib emitir ambos.
    client.on('message_create', async (message) => {
        await handleIncomingMessage(instanceId, client, message);
    });

    client.on('message', async (message) => {
        await handleIncomingMessage(instanceId, client, message);
    });

    return client;
}

// Removed default instance initialization - instances are now created on-demand via API

// API Endpoints

// Get all instances
app.get('/instances', async (req, res) => {
    try {
        const { data: dbInstances, error } = await supabase
            .from('whatsapp_instances')
            .select('*');

        if (error) throw error;

        const instances = dbInstances.map(inst => {
            const client = whatsappInstances.get(inst.id);
            const isConnected = client?.info?.wid !== undefined;
            const hasQRCode = activeQRCodes.has(inst.id);
            const connectedNumber = client?.info?.wid?.user || inst.phone_number;

            if (isConnected && (inst.status !== 'connected' || !inst.phone_number || inst.qr_code !== null)) {
                activeQRCodes.delete(inst.id);
                syncConnectedStatus(inst.id, connectedNumber || null);
            }
            
            return {
                instanceId: inst.id,
                isConnected: isConnected || inst.status === 'connected',
                connectedNumber,
                hasQRCode: hasQRCode || (inst.qr_code !== null && inst.status !== 'connected')
            };
        });

        res.json({ instances });
    } catch (error) {
        console.error('Failed to fetch instances:', error);
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
});

// Reset/Restart instance
app.post('/instances/:instanceId/reset', async (req, res) => {
    try {
        const { instanceId } = req.params;
        console.log(`Resetting instance ${instanceId}...`);

        // 1. Disconnect if exists
        if (whatsappInstances.has(instanceId)) {
            const client = whatsappInstances.get(instanceId);
            try {
                await client.destroy();
            } catch (e) {
                console.error(`Error destroying client ${instanceId}:`, e);
            }
            whatsappInstances.delete(instanceId);
            activeQRCodes.delete(instanceId);
        }

        // 2. Create new
        const client = createWhatsAppClient(instanceId);
        whatsappInstances.set(instanceId, client);
        
        client.initialize().catch(e => console.error(`Failed to re-initialize ${instanceId}:`, e));

        res.json({ success: true, message: `Instance ${instanceId} reset` });
    } catch (error) {
        console.error('Failed to reset instance:', error);
        res.status(500).json({ error: 'Failed to reset instance' });
    }
});

// Health check
app.get('/status', async (req, res) => {
    try {
        const { data: dbInstances, error } = await supabase
            .from('whatsapp_instances')
            .select('id, name, status, phone_number, qr_code');

        if (error) throw error;

        const instances = (dbInstances || []).map((inst) => {
            const client = whatsappInstances.get(inst.id);
            const isConnected = client?.info?.wid !== undefined;
            const connectedNumber = client?.info?.wid?.user || inst.phone_number || null;

            return {
                id: inst.id,
                name: inst.name,
                status: isConnected ? 'connected' : (inst.status || 'disconnected'),
                phone_number: connectedNumber,
                connectedNumber,
                isConnected: isConnected || inst.status === 'connected',
                hasQRCode: activeQRCodes.has(inst.id) || Boolean(inst.qr_code)
            };
        });

        res.json({
            online: true,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            activeInstances: whatsappInstances.size,
            instances
        });
    } catch (error) {
        console.error('Failed to get status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Create new instance
app.post('/instances', async (req, res) => {
    try {
        console.log('POST /instances body:', req.body);
        const { instanceId } = req.body; // Frontend sends instanceId or id

        const id = instanceId || req.body.id;
        const name = req.body.name || `Instance ${id.slice(0, 8)}`;
        console.log('Parsed ID:', id);

        if (!id) {
            return res.status(400).json({ error: 'Instance ID is required' });
        }

        if (whatsappInstances.has(id)) {
            return res.status(400).json({ error: 'Instance already exists' });
        }

        // Create new client instance
        const client = createWhatsAppClient(id, name);
        whatsappInstances.set(id, client);
        
        console.log(`Initializing client for ${id}...`);
        client.initialize()
            .then(() => console.log(`Client initialization command sent for ${id}`))
            .catch((e) => {
                console.error(`Failed to initialize client for ${id}`, e);
            });

        res.json({
            success: true,
            message: `WhatsApp instance ${id} created successfully`,
            instanceId: id
        });
    } catch (error) {
        console.error('Failed to create instance:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
});

// Get QR Code
app.get('/instances/:instanceId/qr', (req, res) => {
    const { instanceId } = req.params;
    const qrCode = activeQRCodes.get(instanceId);
    const client = whatsappInstances.get(instanceId);

    // Frontend expects { qrCode: string }
    res.json({
        instanceId: instanceId,
        qrCode: qrCode,
        isConnected: client ? client.info?.wid !== undefined : false
    });
});

// Get Status
app.get('/instances/:instanceId/status', (req, res) => {
    const { instanceId } = req.params;
    const client = whatsappInstances.get(instanceId);

    if (!client) {
        return res.json({ status: 'disconnected', connected: false });
    }

    res.json({
        instanceId: instanceId,
        status: client.info?.wid !== undefined ? 'connected' : 'connecting',
        connected: client.info?.wid !== undefined,
        phoneNumber: client.info?.wid?.user || null
    });
});

// Detailed health check
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        browserPath: BROWSER_PATH || null,
        instances: {
            total: whatsappInstances.size,
            connected: 0,
            connecting: 0,
            disconnected: 0
        },
        memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
    };

    for (const [id, client] of whatsappInstances.entries()) {
        if (client.info?.wid) {
            health.instances.connected++;
        } else if (activeQRCodes.has(id)) {
            health.instances.connecting++;
        } else {
            health.instances.disconnected++;
        }
    }

    res.json(health);
});

// Disconnect
app.post('/instances/:instanceId/disconnect', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const client = whatsappInstances.get(instanceId);

        if (!client) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        await client.destroy();
        whatsappInstances.delete(instanceId);
        activeQRCodes.delete(instanceId);

        // Update DB
        await supabase
            .from('whatsapp_instances')
            .update({
                status: 'disconnected',
                qr_code: null,
                phone_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', instanceId);

        res.json({
            success: true,
            message: `WhatsApp instance ${instanceId} disconnected successfully`
        });
    } catch (error) {
        console.error('Failed to disconnect instance:', error);
        res.status(500).json({ error: 'Failed to disconnect instance' });
    }
});

// Send message (Text or Media)
app.post('/send-message', async (req, res) => {
    try {
        const { instance_id, phoneNumber, message, mediaUrl, mediaType, fileName, conversation_id, message_id } = req.body;
        
        if (!instance_id) return res.status(400).json({ error: 'instance_id is required' });
        if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber is required' });
        
        const client = whatsappInstances.get(instance_id);
        if (!client) return res.status(404).json({ error: 'Instance not found' });
        
        // Check if connected
        if (!client.info || !client.info.wid) {
             return res.status(400).json({ error: 'Instance not connected' });
        }

        if (message_id) {
            try {
                const { data: existingMessage, error: existingMessageError } = await supabase
                    .from('whatsapp_messages')
                    .select('id, status, whatsapp_message_id')
                    .eq('id', message_id)
                    .maybeSingle();

                if (existingMessageError) {
                    console.error('Failed to check message dedup before direct send:', existingMessageError);
                } else if (existingMessage?.status === 'sent' && existingMessage?.whatsapp_message_id) {
                    return res.json({
                        success: true,
                        deduped: true,
                        whatsapp_message_id: existingMessage.whatsapp_message_id,
                    });
                }
            } catch (dedupError) {
                console.error('Unexpected dedup check error before direct send:', dedupError);
            }
        }

        // Resolve WhatsApp ID using getNumberId (handles Brazilian 9th digit)
        const { primary, variants } = normalizeBrazilianPhone(phoneNumber);
        const candidates = [primary, ...variants].filter(Boolean);
        let resolvedId = null;
        let acceptedVariant = null;

        for (const candidate of candidates) {
            const attempts = [`${candidate}@c.us`, candidate];
            for (const attempt of attempts) {
                try {
                    const numberId = await client.getNumberId(attempt);
                    if (numberId) {
                        resolvedId = numberId._serialized;
                        acceptedVariant = attempt;
                        console.log(`Resolved ${candidate} (attempt: ${attempt}) -> ${resolvedId}`);
                        break;
                    }
                } catch (e) {
                    console.warn(`getNumberId failed for ${attempt}:`, e && e.message ? e.message : e);
                }
            }
            if (resolvedId) break;
        }

        if (acceptedVariant) {
            console.log(`Phone resolution accepted variant: ${acceptedVariant} (original: ${primary})`);
        }

        if (!resolvedId) {
            return res.status(400).json({ error: `Número ${primary} não está registrado no WhatsApp` });
        }

        const formattedNumber = resolvedId;
        const resolvedUser = extractWhatsAppUser(resolvedId);
        if (resolvedUser && conversation_id) {
            await supabase
                .from('whatsapp_conversations')
                .update({ whatsapp_number: resolvedUser, updated_at: new Date().toISOString() })
                .eq('id', conversation_id);
        }
        
        let sentMessage;
        
        // Try to get media info from direct params or from message_id lookup
        let actualMediaUrl = mediaUrl;
        let actualFileName = fileName;
        
        if (!actualMediaUrl && message_id) {
            try {
                const { data: msgData } = await supabase
                    .from('whatsapp_messages')
                    .select('metadata, has_media')
                    .eq('id', message_id)
                    .single();
                
                if (msgData?.has_media && msgData?.metadata) {
                    actualMediaUrl = msgData.metadata.media_url;
                    actualFileName = msgData.metadata.file_name;
                }
            } catch (e) {
                console.error('Failed to fetch message metadata:', e);
            }
        }
        
        if (actualMediaUrl) {
            console.log(`Sending media to ${formattedNumber} via instance ${instance_id}`);
            try {
                let media;
                
                // For audio files, send as document to avoid WhatsApp Web audio validation issues
                if (mediaType && mediaType.startsWith('audio/')) {
                    console.log('Processing audio file as document...');
                    
                    // Use fromUrl
                    media = await MessageMedia.fromUrl(actualMediaUrl);
                    if (actualFileName) media.filename = actualFileName;
                    
                    // Force audio mimetype
                    if (media.mimetype.includes('webm') || media.mimetype.includes('ogg')) {
                        media.mimetype = 'audio/ogg; codecs=opus';
                    }
                    
                    console.log(`Audio loaded, size: ${media.data.length} bytes, mimetype: ${media.mimetype}`);
                    
                    // Send as document with audio type (bypasses WhatsApp Web audio validation)
                    sentMessage = await client.sendMessage(formattedNumber, media, {
                        sendMediaAsDocument: true,
                        sendSeen: false
                    });
                    console.log('Audio sent successfully as document');
                } else {
                    // For other media types, use fromUrl as before
                    media = await MessageMedia.fromUrl(actualMediaUrl);
                    if (actualFileName) media.filename = actualFileName;
                    sentMessage = await client.sendMessage(formattedNumber, media, { caption: message || '', sendSeen: false });
                }
            } catch (mediaError) {
                console.error('Error sending media, details:', mediaError);
                throw new Error(`Failed to send media: ${normalizeWhatsAppSendError(mediaError)}`);
            }
        } else {
            console.log(`Sending text to ${formattedNumber} via instance ${instance_id}`);
            sentMessage = await client.sendMessage(formattedNumber, message, { sendSeen: false });
        }
        
        // Update message status in database if message_id provided
        if (message_id) {
            try {
                await supabase
                    .from('whatsapp_messages')
                    .update({
                        status: 'sent',
                        whatsapp_message_id: sentMessage.id._serialized,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', message_id);
                console.log(`✓ Updated message ${message_id} status to sent`);
            } catch (dbError) {
                console.error('Failed to update message status in DB:', dbError);
                // Don't fail the request if DB update fails - message was sent successfully
            }
        }
        
        res.json({ 
            success: true, 
            whatsapp_message_id: sentMessage.id._serialized,
            timestamp: sentMessage.timestamp 
        });
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Try to mark as failed in DB if message_id provided
        if (req.body.message_id) {
            try {
                await supabase
                    .from('whatsapp_messages')
                    .update({
                        status: 'failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', req.body.message_id);
            } catch (dbError) {
                console.error('Failed to mark message as failed in DB:', dbError);
            }
        }
        
        res.status(500).json({ error: normalizeWhatsAppSendError(error) });
    }
});

// Start server
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`\n✓ Multi-WhatsApp service is running on http://localhost:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/status`);
    console.log(`✓ Ready to create instances via POST /instances\n`);

    restoreActiveInstances().catch((error) => {
        console.error('Failed to restore instances after startup:', error);
    });
    
    subscribeToOutgoingMessages();
    startRetryWorker();

    // POLLING DISABLED: was causing infinite loop resending messages
    console.log('⚠️  Polling fallback is DISABLED to prevent message loops');
});

// Delete instance (remove client, session files and update DB)
app.delete('/instances/:instanceId', async (req, res) => {
    try {
        const { instanceId } = req.params;

        const client = whatsappInstances.get(instanceId);

        if (client) {
            try {
                await client.destroy();
            } catch (e) {
                console.error(`Error destroying client ${instanceId}:`, e);
            }

            whatsappInstances.delete(instanceId);
            activeQRCodes.delete(instanceId);
        }

        // Update DB to mark as disconnected / removed
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    qr_code: null,
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
        } catch (dbErr) {
            console.error(`Failed to update Supabase for deleted instance ${instanceId}:`, dbErr);
        }

        // Remove local session folder if exists
        try {
            const sanitizedId = instanceId.replace(/-/g, '');
            const sessionDir = `./whatsapp-session-${sanitizedId}`;
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`Removed session dir ${sessionDir}`);
            }
        } catch (fsErr) {
            console.error(`Failed to remove session directory for ${instanceId}:`, fsErr);
        }

        res.json({ success: true, instanceId });
    } catch (error) {
        console.error('Failed to delete instance:', error);
        res.status(500).json({ error: 'Failed to delete instance' });
    }
});