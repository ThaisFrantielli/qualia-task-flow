// simple-whatsapp-service.js
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); // Opcional, para debug no console

console.log('Iniciando serviço WhatsApp Real...');

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

console.log(`Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Armazena as instâncias ativas: Map<instanceId, { client: Client, name: string, ... }>
const instances = new Map();

async function updateSupabase(id, updates) {
    try {
        console.log(`[Supabase] Atualizando instância ${id}:`, updates);
        const { error } = await supabase
            .from('whatsapp_instances')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('[Supabase] Erro ao atualizar:', error);
        }
    } catch (err) {
        console.error('[Supabase] Exceção ao atualizar:', err);
    }
}

// Inicializa uma nova instância do WhatsApp
const initializeInstance = async (instanceId, name) => {
    console.log(`[Init] Inicializando cliente para ${instanceId} (${name})`);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: instanceId }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    // Armazena referência
    instances.set(instanceId, {
        client,
        name,
        status: 'initializing',
        qrCode: null,
        phoneNumber: null
    });

    // Eventos do Cliente
    client.on('qr', async (qr) => {
        console.log(`[QR] Novo QR Code para ${instanceId}`);
        // qrcode.generate(qr, { small: true }); // Debug no terminal

        const record = instances.get(instanceId);
        if (record) {
            record.qrCode = qr;
            record.status = 'connecting';
            await updateSupabase(instanceId, { status: 'connecting', qr_code: qr });
        }
    });

    client.on('ready', async () => {
        console.log(`[Ready] Cliente ${instanceId} está pronto!`);
        const record = instances.get(instanceId);
        if (record) {
            const user = client.info.wid.user;
            record.status = 'connected';
            record.qrCode = null;
            record.phoneNumber = user;

            await updateSupabase(instanceId, {
                status: 'connected',
                qr_code: null,
                phone_number: user
            });
        }
    });

    client.on('authenticated', () => {
        console.log(`[Auth] Cliente ${instanceId} autenticado`);
    });

    client.on('auth_failure', msg => {
        console.error(`[Auth Failure] ${instanceId}:`, msg);
    });

    // Tratamento de mensagens recebidas
    client.on('message', async (msg) => {
        try {
            // Ignorar mensagens de status ou grupos por enquanto
            if (msg.isStatus || msg.from.includes('@g.us')) return;

            console.log(`[Message] Nova mensagem de ${msg.from} para ${instanceId}: ${msg.body}`);

            const fromNumber = msg.from.replace('@c.us', '');
            const content = msg.body || (msg.hasMedia ? '[MÍDIA]' : '');
            const hasMedia = msg.hasMedia;

            // 1. Buscar ou criar conversação
            let conversationId = null;

            // Tentar encontrar conversa existente
            const { data: existingConv } = await supabase
                .from('whatsapp_conversations')
                .select('id, unread_count')
                .eq('instance_id', instanceId)
                .eq('whatsapp_number', fromNumber)
                .maybeSingle();

            if (existingConv) {
                conversationId = existingConv.id;
            } else {
                // Tentar encontrar cliente pelo telefone para vincular
                const { data: client } = await supabase
                    .from('clientes')
                    .select('id')
                    .or(`whatsapp_number.eq.${fromNumber},telefone.eq.${fromNumber}`)
                    .maybeSingle();

                // Criar nova conversa
                const { data: newConv, error: createError } = await supabase
                    .from('whatsapp_conversations')
                    .insert({
                        instance_id: instanceId,
                        whatsapp_number: fromNumber,
                        cliente_id: client ? client.id : null,
                        status: 'waiting', // Set to waiting for auto-distribution
                        customer_name: msg._data?.notifyName || fromNumber
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Erro ao criar conversa:', createError);
                    return;
                }
                conversationId = newConv.id;
            }

            // 2. Processar mídia se houver
            let mediaMetadata = null;
            if (hasMedia) {
                try {
                    console.log(`[Media] Baixando mídia da mensagem ${msg.id.id}...`);
                    const media = await msg.downloadMedia();
                    
                    if (media) {
                        const buffer = Buffer.from(media.data, 'base64');
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${media.mimetype.split('/')[1]}`;
                        const filePath = `whatsapp/${fileName}`;

                        // Upload to Supabase Storage
                        const { error: uploadError } = await supabase.storage
                            .from('whatsapp-media')
                            .upload(filePath, buffer, {
                                contentType: media.mimetype,
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('[Media] Erro ao fazer upload:', uploadError);
                        } else {
                            // Get public URL
                            const { data: { publicUrl } } = supabase.storage
                                .from('whatsapp-media')
                                .getPublicUrl(filePath);

                            mediaMetadata = {
                                media_type: media.mimetype.startsWith('image/') ? 'image' :
                                           media.mimetype.startsWith('video/') ? 'video' :
                                           media.mimetype.startsWith('audio/') ? 'audio' : 'document',
                                file_name: media.filename || fileName,
                                mime_type: media.mimetype,
                                storage_url: publicUrl,
                                file_size: buffer.length
                            };

                            console.log('[Media] Upload concluído:', publicUrl);
                        }
                    }
                } catch (mediaErr) {
                    console.error('[Media] Erro ao processar mídia:', mediaErr);
                }
            }

            // 3. Salvar mensagem
            const { data: savedMessage, error: msgError } = await supabase
                .from('whatsapp_messages')
                .insert({
                    conversation_id: conversationId,
                    instance_id: instanceId,
                    content: content,
                    sender_type: 'customer',
                    message_type: mediaMetadata ? mediaMetadata.media_type : (msg.type || 'text'),
                    whatsapp_message_id: msg.id.id,
                    status: 'delivered',
                    has_media: hasMedia,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (msgError) {
                console.error('Erro ao salvar mensagem:', msgError);
            } else if (mediaMetadata && savedMessage) {
                // 4. Salvar metadata da mídia
                const { error: mediaDbError } = await supabase
                    .from('whatsapp_media')
                    .insert({
                        message_id: savedMessage.id,
                        conversation_id: conversationId,
                        ...mediaMetadata,
                        caption: msg.body || null
                    });

                if (mediaDbError) console.error('Erro ao salvar metadata da mídia:', mediaDbError);
            }

            // 5. Atualizar conversa
            await supabase
                .from('whatsapp_conversations')
                .update({
                    last_message: hasMedia ? `📎 ${mediaMetadata?.media_type || 'Arquivo'}` : content,
                    last_message_at: new Date().toISOString(),
                    unread_count: (existingConv?.unread_count || 0) + 1
                })
                .eq('id', conversationId);

        } catch (err) {
            console.error('Erro ao processar mensagem:', err);
        }
    });

    client.on('disconnected', async (reason) => {
        console.log(`[Disconnected] Cliente ${instanceId} desconectado:`, reason);
        const record = instances.get(instanceId);
        if (record) {
            record.status = 'disconnected';
            record.qrCode = null;
            await updateSupabase(instanceId, { status: 'disconnected', qr_code: null });
        }
    });

    try {
        await client.initialize();
    } catch (err) {
        console.error(`[Init Error] Falha ao inicializar ${instanceId}:`, err);
    }
};

app.get('/status', async (req, res) => {
    const list = Array.from(instances.values()).map(r => ({
        id: r.client.options.authStrategy.clientId, // Recupera ID do LocalAuth
        name: r.name,
        status: r.status,
        phoneNumber: r.phoneNumber,
        qr_code: r.qrCode
    }));
    res.json({ instances: list });
});

app.post('/instances', async (req, res) => {
    const { id, name } = req.body;
    const instanceId = id || uuidv4();

    if (instances.has(instanceId)) {
        return res.status(400).json({ error: 'Instância já existe' });
    }

    initializeInstance(instanceId, name);

    res.json({ instanceId, name, status: 'initializing' });
});

app.delete('/instances/:id', async (req, res) => {
    const { id } = req.params;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    try {
        await record.client.destroy();
    } catch (e) {
        console.error('Erro ao destruir cliente:', e);
    }

    instances.delete(id);
    await updateSupabase(id, { status: 'disconnected', qr_code: null });

    res.json({ success: true, instanceId: id });
});

app.post('/instances/:id/disconnect', async (req, res) => {
    const { id } = req.params;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    try {
        await record.client.logout();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Envio de mensagens
app.post('/send-message', async (req, res) => {
    const { phoneNumber, message, instance_id } = req.body;

    console.log(`[Send] Tentando enviar para ${phoneNumber} via ${instance_id || 'default'}`);

    // Se não passar instance_id, tenta pegar a primeira conectada (fallback)
    let targetInstanceId = instance_id;
    if (!targetInstanceId && instances.size > 0) {
        targetInstanceId = instances.keys().next().value;
    }

    const record = instances.get(targetInstanceId);
    if (!record || record.status !== 'connected') {
        console.error('[Send] Instância não conectada:', targetInstanceId);
        return res.status(400).json({ error: 'Instância não encontrada ou desconectada' });
    }

    try {
        const formattedPhone = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        const sentMsg = await record.client.sendMessage(formattedPhone, message);
        console.log('[Send] Mensagem enviada no WhatsApp. ID:', sentMsg.id.id);

        // Persistir mensagem enviada no Supabase
        // Primeiro, encontrar a conversa
        const cleanPhone = phoneNumber.replace('@c.us', '');

        let { data: conversation, error: findError } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('instance_id', targetInstanceId)
            .eq('whatsapp_number', cleanPhone)
            .maybeSingle();

        if (findError) console.error('[Send] Erro ao buscar conversa:', findError);

        // Se não existir conversa (iniciada pelo usuário), criar
        if (!conversation) {
            console.log('[Send] Conversa não encontrada. Criando nova...');
            const { data: newConv, error: createError } = await supabase
                .from('whatsapp_conversations')
                .insert({
                    instance_id: targetInstanceId,
                    whatsapp_number: cleanPhone,
                    status: 'active',
                    last_message: message,
                    last_message_at: new Date().toISOString()
                    // TODO: Tentar vincular cliente aqui também se possível
                })
                .select()
                .single();

            if (createError) {
                console.error('[Send] Erro ao criar conversa:', createError);
            } else {
                conversation = newConv;
                console.log('[Send] Nova conversa criada:', conversation.id);
            }
        } else {
            const { error: updateError } = await supabase
                .from('whatsapp_conversations')
                .update({
                    last_message: message,
                    last_message_at: new Date().toISOString()
                })
                .eq('id', conversation.id);

            if (updateError) console.error('[Send] Erro ao atualizar conversa:', updateError);
        }

        if (conversation) {
            const { error: msgError } = await supabase
                .from('whatsapp_messages')
                .insert({
                    conversation_id: conversation.id,
                    instance_id: targetInstanceId,
                    content: message,
                    sender_type: 'user',
                    message_type: 'text',
                    whatsapp_message_id: sentMsg.id.id,
                    status: 'sent',
                    created_at: new Date().toISOString()
                });

            if (msgError) console.error('[Send] Erro ao salvar mensagem:', msgError);
            else console.log('[Send] Mensagem salva no banco.');
        } else {
            console.error('[Send] Não foi possível salvar a mensagem pois a conversa não foi recuperada/criada.');
        }

        res.json({ success: true, id: sentMsg.id.id });
    } catch (err) {
        console.error('[Send] Erro ao enviar mensagem:', err);
        res.status(500).json({ error: err.message });
    }
});

// Envio de mídia
app.post('/send-media', async (req, res) => {
    const { phoneNumber, mediaUrl, mediaType, caption, instance_id, fileName, mimeType } = req.body;

    console.log(`[SendMedia] Tentando enviar ${mediaType} para ${phoneNumber} via ${instance_id || 'default'}`);

    // Se não passar instance_id, tenta pegar a primeira conectada (fallback)
    let targetInstanceId = instance_id;
    if (!targetInstanceId && instances.size > 0) {
        targetInstanceId = instances.keys().next().value;
    }

    const record = instances.get(targetInstanceId);
    if (!record || record.status !== 'connected') {
        console.error('[SendMedia] Instância não conectada:', targetInstanceId);
        return res.status(400).json({ error: 'Instância não encontrada ou desconectada' });
    }

    try {
        const formattedPhone = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        // WhatsApp Web.js MessageMedia
        const { MessageMedia } = require('whatsapp-web.js');
        
        // Download media from URL
        const axios = require('axios');
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const base64Data = buffer.toString('base64');

        // Create MessageMedia object
        const media = new MessageMedia(mimeType, base64Data, fileName);

        // Send media with optional caption
        const sentMsg = await record.client.sendMessage(formattedPhone, media, { caption: caption || '' });
        console.log('[SendMedia] Mídia enviada no WhatsApp. ID:', sentMsg.id.id);

        res.json({ success: true, id: sentMsg.id.id });
    } catch (err) {
        console.error('[SendMedia] Erro ao enviar mídia:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', instances: instances.size });
});

async function restoreSessions() {
    console.log('[Restore] Verificando sessões para restaurar...');
    const { data: instancesToRestore, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'connected');

    if (error) {
        console.error('[Restore] Erro ao buscar instâncias:', error);
        return;
    }

    if (instancesToRestore && instancesToRestore.length > 0) {
        console.log(`[Restore] Encontradas ${instancesToRestore.length} instâncias para restaurar.`);
        for (const instance of instancesToRestore) {
            console.log(`[Restore] Restaurando ${instance.name} (${instance.id})...`);
            await initializeInstance(instance.id, instance.name);
        }
    } else {
        console.log('[Restore] Nenhuma instância ativa encontrada.');
    }
}

const PORT = process.env.PORT || 3005;
app.listen(PORT, async () => {
    console.log(`✅ WhatsApp Service Real rodando na porta ${PORT}`);
    await restoreSessions();
});