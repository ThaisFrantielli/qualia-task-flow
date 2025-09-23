<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Oportunidade;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('chat.{oportunidadeId}', function ($user, $oportunidadeId) {
    $oportunidade = Oportunidade::findOrFail($oportunidadeId);
    
    // User can access the chat if they can view the opportunity
    return $user->can('view', $oportunidade);
});