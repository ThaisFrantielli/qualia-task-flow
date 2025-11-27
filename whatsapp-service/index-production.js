const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create media storage directory
const MEDIA_DIR = path.join(__dirname, 'media');
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, MEDIA_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mp3|wav|ogg|aac|m4a|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado'));
        }
    }
});

// Supabase configuration
const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentQRCode = null;
let client = null;
let isInitializing = false;

const PORT = 3005;

// Improved Puppeteer configuration for Codespaces
const createWhatsAppClient = () => {
    return new Client({
        authStrategy: new LocalAuth({
            dataPath: './whatsapp-session-default',
            clientId: 'whatsapp-client-default'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-blink-features=AutomationControlled',
                '--disable-notifications',
                '--disable-popup-blocking',
                '--disable-web-gl',
                '--disable-canvas-aa',
                '--disable-3d-apis'
            ]
        },
        qrMaxRetries: 5,
        restartOnAuthFail: false
    });
};

// Initialize WhatsApp client with error handling
const initializeWhatsAppClient = async () => {
    if (isInitializing) {
        console.log('⏳ WhatsApp client is already being initialized...');
        return;
    }
    
    isInitializing = true;
    console.log('🚀 Initializing WhatsApp client...');
    
    try {
        client = createWhatsAppClient();
        
        // Set up event handlers
        setupClientEventHandlers();
        
        // Initialize the client
        await client.initialize();
        console.log('✅ WhatsApp client initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp client:', error);
        client = null;
    } finally {
        isInitializing = false;
    }
};

// Setup all WhatsApp client event handlers
const setupClientEventHandlers = () => {
    if (!client) return;

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log('📱 QR Code received, generating terminal output...');
        console.log('QR Code length:', qr.length);
        qrcode.generate(qr, { small: true });
        currentQRCode = qr;
        
        // Save QR Code to Supabase
        try {
            const result = await supabase
                .from('whatsapp_config')
                .upsert({
                    id: 'default',
                    qr_code: qr,
                    is_connected: false,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });
            
            if (result.error) {
                console.error('Supabase error:', result.error);
            } else {
                console.log('✅ QR Code saved to Supabase successfully');
            }
        } catch (error) {
            console.error('❌ Failed to save QR Code to Supabase:', error);
        }
        
        // QR code expires after 45 seconds
        setTimeout(() => {
            console.log('⏰ QR Code should refresh soon...');
        }, 45000);
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log('✅ WhatsApp client is ready!');
        
        // Update connection status in Supabase
        try {
            const connectedNumber = client.info?.wid?.user || 'unknown';
            await supabase
                .from('whatsapp_config')
                .update({
                    is_connected: true,
                    connected_number: connectedNumber,
                    qr_code: null,
                    last_connection_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', 'default');
            console.log(`📞 WhatsApp connected with number: ${connectedNumber}`);
        } catch (error) {
            console.error('❌ Failed to update connection status in Supabase:', error);
        }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
        console.log('📴 WhatsApp client disconnected:', reason);
        currentQRCode = null;
        
        // Update status in Supabase
        try {
            await supabase
                .from('whatsapp_config')
                .update({
                    is_connected: false,
                    connected_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 'default');
            console.log('📝 Disconnection status updated in Supabase');
        } catch (error) {
            console.error('❌ Failed to update disconnection status in Supabase:', error);
        }
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error('🔐 Authentication failed:', msg);
        currentQRCode = null;
        
        // Clear session and force new QR
        try {
            await supabase
                .from('whatsapp_config')
                .update({
                    is_connected: false,
                    connected_number: null,
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 'default');
            console.log('📝 Authentication failure status updated in Supabase');
        } catch (error) {
            console.error('❌ Failed to update auth failure status in Supabase:', error);
        }
    });

    // Listen for incoming messages with media support
    client.on('message', async (message) => {
        console.log(`📨 Message received from ${message.from}`);
        console.log(`Type: ${message.type}, Has Media: ${message.hasMedia}`);
        console.log(`Content: ${message.body || '[Media message]'}`);

        let messageData = {
            from: message.from,
            to: client.info?.wid?.user || 'unknown',
            body: message.body || '',
            timestamp: message.timestamp,
            type: message.type,
            id: message.id._serialized,
            hasMedia: message.hasMedia
        };

        // Handle media messages
        if (message.hasMedia) {
            try {
                console.log('📎 Processing media message...');
                const media = await message.downloadMedia();
                
                if (media) {
                    // Save media file
                    const timestamp = Date.now();
                    const extension = media.mimetype.split('/')[1] || 'bin';
                    const fileName = `${message.id._serialized}_${timestamp}.${extension}`;
                    const filePath = path.join(MEDIA_DIR, fileName);
                    
                    // Convert base64 to buffer and save
                    const buffer = Buffer.from(media.data, 'base64');
                    fs.writeFileSync(filePath, buffer);
                    
                    console.log(`💾 Media saved: ${fileName} (${buffer.length} bytes)`);
                    
                    // Add media info to message data
                    messageData.mediaInfo = {
                        fileName: fileName,
                        mimetype: media.mimetype,
                        filesize: buffer.length,
                        caption: message.body || ''
                    };
                }
            } catch (mediaError) {
                console.error('❌ Failed to process media:', mediaError);
                messageData.mediaError = mediaError.message;
            }
        }

        // Forward message to Supabase Edge Function
        try {
            const info = await client.info;
            const companyNumber = info.wid.user;
            
            await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, messageData, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('📤 Message forwarded to Supabase webhook', message.hasMedia ? '(with media)' : '');
        } catch (error) {
            console.error('❌ Failed to forward message to Supabase webhook:', error);
        }
    });
};

// API endpoint to get QR code and connection status
app.get('/qr-code', (req, res) => {
    res.json({
        qrCode: currentQRCode,
        isConnected: client?.info?.wid !== undefined
    });
});

// API endpoint to get connection status
app.get('/status', (req, res) => {
    res.json({
        isConnected: client?.info?.wid !== undefined,
        connectedNumber: client?.info?.wid?.user || null,
        clientState: client ? client.getState() : 'DISCONNECTED'
    });
});

// API endpoint to force new QR code
app.post('/reset-session', async (req, res) => {
    try {
        console.log('🔄 Forcing session reset...');
        if (client) {
            await client.destroy();
        }
        
        // Clear QR code in Supabase
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: false,
                qr_code: null,
                connected_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        
        currentQRCode = null;
        client = null;
        
        // Restart client
        setTimeout(() => {
            initializeWhatsAppClient();
        }, 2000);
        
        res.json({ success: true, message: 'Session reset, new QR code will be generated' });
    } catch (error) {
        console.error('❌ Failed to reset session:', error);
        res.status(500).json({ error: 'Failed to reset session' });
    }
});

// API endpoint to disconnect WhatsApp
app.post('/disconnect', async (req, res) => {
    try {
        if (client) {
            await client.logout();
        }
        res.json({ success: true, message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('❌ Failed to disconnect WhatsApp:', error);
        res.status(500).json({ success: false, error: 'Failed to disconnect WhatsApp' });
    }
});

// API endpoint to send messages
app.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    console.log(`📤 Sending message to ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`Client ready: ${client?.info?.wid?.user || 'Not connected'}`);

    try {
        if (!client || !client.info?.wid) {
            throw new Error('WhatsApp client is not connected');
        }

        // Ensure phone number format is correct
        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        await client.sendMessage(formattedNumber, message);
        console.log(`✅ Message sent successfully to ${formattedNumber}`);
        
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// Simple HTML page to view QR code in the browser
app.get('/qr-view', (req, res) => {
    if (!currentQRCode) {
        return res.send(`
            <html>
                <head><title>WhatsApp QR</title></head>
                <body style="font-family: sans-serif;">
                    <h3>Nenhum QR Code disponível no momento.</h3>
                    <p>Se o cliente não estiver conectado, aguarde a geração do QR ou faça POST /reset-session.</p>
                </body>
            </html>
        `);
    }
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentQRCode)}`;
    res.send(`
        <html>
            <head><title>WhatsApp QR</title></head>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f7f7f7;font-family:sans-serif;">
                <div style="text-align:center;background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin:0 0 12px">Escaneie para conectar</h3>
                    <img alt="WhatsApp QR" src="${src}" />
                    <p style="color:#555">Atualize a página se expirar (45s).</p>
                </div>
            </body>
        </html>
    `);
});

// Send media message
app.post('/send-media', upload.single('media'), async (req, res) => {
    try {
        const { phoneNumber, caption } = req.body;
        const mediaFile = req.file;

        if (!mediaFile) {
            return res.status(400).json({ success: false, error: 'No media file provided' });
        }

        console.log(`📎 Sending media to ${phoneNumber}`);
        console.log(`File: ${mediaFile.originalname} (${mediaFile.size} bytes)`);

        if (!client || !client.info?.wid) {
            throw new Error('WhatsApp client is not connected');
        }

        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        // Create MessageMedia object
        const media = MessageMedia.fromFilePath(mediaFile.path);
        media.filename = mediaFile.originalname;

        // Send media message
        await client.sendMessage(formattedNumber, media, { caption: caption });
        
        console.log(`✅ Media sent successfully to ${formattedNumber}`);
        
        // Clean up uploaded file
        fs.unlinkSync(mediaFile.path);
        
        res.status(200).json({ 
            success: true, 
            message: 'Media sent successfully',
            fileName: mediaFile.originalname,
            fileSize: mediaFile.size
        });
    } catch (error) {
        console.error('❌ Failed to send media:', error);
        
        // Clean up file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ success: false, error: 'Failed to send media' });
    }
});

// Send media from URL
app.post('/send-media-url', async (req, res) => {
    try {
        const { phoneNumber, mediaUrl, caption, fileName } = req.body;

        if (!mediaUrl) {
            return res.status(400).json({ success: false, error: 'No media URL provided' });
        }

        console.log(`🌐 Sending media from URL to ${phoneNumber}`);
        console.log(`URL: ${mediaUrl}`);

        if (!client || !client.info?.wid) {
            throw new Error('WhatsApp client is not connected');
        }

        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        // Download media from URL
        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            responseType: 'arraybuffer'
        });

        // Detect mime type
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const extension = contentType.includes('image') ? 'jpg' : 
                         contentType.includes('video') ? 'mp4' : 
                         contentType.includes('audio') ? 'mp3' : 'bin';
        const finalFileName = fileName || `media.${extension}`;

        // Create MessageMedia object from buffer
        const media = new MessageMedia(contentType, Buffer.from(response.data).toString('base64'), finalFileName);

        // Send media message
        await client.sendMessage(formattedNumber, media, { caption: caption });
        
        console.log(`✅ Media from URL sent successfully to ${formattedNumber}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Media from URL sent successfully',
            fileName: finalFileName,
            contentType: contentType
        });
    } catch (error) {
        console.error('❌ Failed to send media from URL:', error);
        res.status(500).json({ success: false, error: 'Failed to send media from URL' });
    }
});

// Media upload test page
app.get('/test-media', (req, res) => {
    res.send(`
        <html>
            <head><title>WhatsApp Media Test</title></head>
            <body style="font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <h2>🎥 Teste de Envio de Mídia WhatsApp</h2>
                
                <h3>📎 Enviar Arquivo</h3>
                <form action="/send-media" method="post" enctype="multipart/form-data" style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <p>
                        <label><strong>📱 Número do telefone:</strong></label><br>
                        <input type="text" name="phoneNumber" placeholder="5561996187305" required style="width: 100%; max-width: 300px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; display: block;">Use o número da Thais: 5561996187305</small>
                    </p>
                    <p>
                        <label><strong>📁 Arquivo:</strong></label><br>
                        <input type="file" name="media" required style="padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; display: block;">Suporte: imagens, vídeos, áudios, documentos (até 50MB)</small>
                    </p>
                    <p>
                        <label><strong>💬 Legenda (opcional):</strong></label><br>
                        <textarea name="caption" placeholder="Digite uma legenda..." style="width: 100%; max-width: 400px; height: 60px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </p>
                    <p>
                        <button type="submit" style="padding: 12px 24px; background: #25d366; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">📎 Enviar Arquivo</button>
                    </p>
                </form>

                <h3>🌐 Enviar por URL</h3>
                <form action="/send-media-url" method="post" style="background: #f0f8ff; padding: 20px; border-radius: 8px;">
                    <p>
                        <label><strong>📱 Número do telefone:</strong></label><br>
                        <input type="text" name="phoneNumber" placeholder="5561996187305" required style="width: 100%; max-width: 300px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    </p>
                    <p>
                        <label><strong>🔗 URL da mídia:</strong></label><br>
                        <input type="url" name="mediaUrl" placeholder="https://example.com/image.jpg" required style="width: 100%; max-width: 400px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; display: block;">Ex: https://via.placeholder.com/300x200.jpg</small>
                    </p>
                    <p>
                        <label><strong>📄 Nome do arquivo (opcional):</strong></label><br>
                        <input type="text" name="fileName" placeholder="imagem.jpg" style="width: 100%; max-width: 300px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
                    </p>
                    <p>
                        <label><strong>💬 Legenda (opcional):</strong></label><br>
                        <textarea name="caption" placeholder="Digite uma legenda..." style="width: 100%; max-width: 400px; height: 60px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </p>
                    <p>
                        <button type="submit" style="padding: 12px 24px; background: #1877f2; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">🌐 Enviar por URL</button>
                    </p>
                </form>

                <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 8px;">
                    <h4>📋 Instruções de Teste:</h4>
                    <ol>
                        <li>Use o número da <strong>Thais: 5561996187305</strong></li>
                        <li>Teste com diferentes tipos de arquivo: JPG, PNG, MP4, MP3, PDF</li>
                        <li>Use URLs públicas para teste, ex: <a href="https://via.placeholder.com/300x200.jpg" target="_blank">https://via.placeholder.com/300x200.jpg</a></li>
                        <li>Verifique se a mídia chega no WhatsApp da Thais</li>
                    </ol>
                </div>
            </body>
        </html>
    `);
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp service is running on http://localhost:${PORT}`);
    console.log(`🌐 Server is ready and accepting connections`);
    console.log(`📎 Media upload endpoint: http://localhost:${PORT}/send-media`);
    console.log(`🧪 Test media page: http://localhost:${PORT}/test-media`);
});

// Initialize WhatsApp client
console.log('🔧 Starting WhatsApp service initialization...');
initializeWhatsAppClient();

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.error('Error destroying client:', error);
        }
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.error('Error destroying client:', error);
        }
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.log('🔄 Attempting to restart...');
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log it
});