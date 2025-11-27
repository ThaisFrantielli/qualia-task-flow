<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMessageResource;
use App\Models\Oportunidade;
use App\Models\ChatMessage;
use App\Events\NewMessageCreated;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ChatMessageController extends Controller
{
    /**
     * List messages for a specific opportunity
     */
    public function index(Request $request, Oportunidade $oportunidade): AnonymousResourceCollection
    {
        $this->authorize('view', $oportunidade);

        $query = $oportunidade->chatMessages()
            ->with(['user', 'replies.user'])
            ->withCount('replies')
            ->whereNull('parent_message_id') // Get only top-level messages
            ->latest();

        // Apply search if provided
        if ($request->has('search')) {
            $query->where('content', 'like', '%' . $request->search . '%');
        }

        // Get messages with pagination
        $messages = $query->paginate(25);

        return ChatMessageResource::collection($messages);
    }

    /**
     * Store a newly created message in storage.
     */
    public function store(Request $request, Oportunidade $oportunidade)
    {
        $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'parent_message_id' => ['nullable', 'exists:chat_messages,id'],
            'metadata' => ['nullable', 'array'],
        ]);

        // Check if user has permission to send messages in this opportunity
        $this->authorize('view', $oportunidade);

        // Create the message
        $message = new ChatMessage([
            'content' => $request->content,
            'parent_message_id' => $request->parent_message_id,
            'metadata' => $request->metadata,
        ]);

        $message->oportunidade()->associate($oportunidade);
        $message->user()->associate($request->user());
        $message->save();

        // Load relationships for the resource
        $message->load(['user', 'replies.user']);

        // Send the message via WhatsApp API
        try {
            $whatsapp = new \Netflie\WhatsAppCloudApi\WhatsAppCloudApi([
                'access_token' => env('WHATSAPP_API_TOKEN'),
                'phone_number_id' => env('WHATSAPP_API_PHONE_NUMBER_ID'),
            ]);

            $customerPhone = $oportunidade->customer_phone;
            $whatsapp->sendTextMessage($customerPhone, $message->content);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Failed to send WhatsApp message', ['error' => $e->getMessage()]);
        }

        // Broadcast the new message to other users
        broadcast(new NewMessageCreated($message))->toOthers();

        // Return the message resource
        return new ChatMessageResource($message);
    }

    /**
     * Mark a message as read.
     */
    public function markAsRead(Request $request, Oportunidade $oportunidade, ChatMessage $message)
    {
        $this->authorize('view', $oportunidade);

        if ($message->oportunidade_id !== $oportunidade->id) {
            abort(404);
        }

        $message->markAsRead();

        return response()->json(['success' => true]);
    }
}