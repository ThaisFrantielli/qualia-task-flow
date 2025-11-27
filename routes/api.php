<?php

use App\Http\Controllers\Api\ChatMessageController;
use App\Http\Controllers\Api\OportunidadeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum'])->group(function () {
    // Oportunidades routes
    Route::get('/oportunidades', [OportunidadeController::class, 'index'])
        ->name('api.oportunidades.index');
    
    Route::prefix('/oportunidades/{oportunidade}')->group(function () {
        // Chat messages for a specific opportunity
        Route::get('/messages', [ChatMessageController::class, 'index'])
            ->name('api.oportunidades.messages.index');
    });
});