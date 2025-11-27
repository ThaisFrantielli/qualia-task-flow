<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'oportunidade_id',
        'user_id',
        'content',
        'parent_message_id',
        'is_system_message',
        'metadata',
        'read_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_system_message' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $with = ['user']; // Always load the user relationship

    /**
     * Get the opportunity that owns the message.
     */
    public function oportunidade(): BelongsTo
    {
        return $this->belongsTo(Oportunidade::class);
    }

    /**
     * Get the user that created the message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the parent message if this is a reply.
     */
    public function parentMessage(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'parent_message_id');
    }

    /**
     * Get the replies to this message.
     */
    public function replies(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'parent_message_id');
    }

    /**
     * Mark the message as read.
     */
    public function markAsRead(): bool
    {
        if (!$this->read_at) {
            $this->read_at = now();
            return $this->save();
        }
        return false;
    }
}