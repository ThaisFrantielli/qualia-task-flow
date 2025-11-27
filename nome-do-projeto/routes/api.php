<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WhatsAppWebhookController;

Route::post('/webhook/whatsapp', [WhatsAppWebhookController::class, 'handleWebhook']);