import React, { useState } from 'react';
import { useWhatsAppConversations, useWhatsAppMessages } from '../hooks/useWhatsAppConversations';

interface WhatsAppChatProps {
  customerId: string;
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ customerId }) => {
  const { conversations, loading: convLoading, error: convError } = useWhatsAppConversations(customerId);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { messages, loading: msgLoading, error: msgError } = useWhatsAppMessages(selectedConversationId || undefined);
  const [newMessage, setNewMessage] = useState('');

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleSendMessage = async () => {
    // TODO: Integrate with Edge Function whatsapp-send
    setNewMessage('');
  };

  return (
    <div className="whatsapp-chat">
      <div className="conversations-list">
        <h3>Conversas</h3>
        {convLoading && <p>Carregando...</p>}
        {convError && <p>Erro: {convError}</p>}
        <ul>
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={conv.id === selectedConversationId ? 'selected' : ''}
              onClick={() => handleSelectConversation(conv.id)}
            >
              {conv.last_message}
              <span style={{ fontSize: '0.8em', color: '#888' }}>{conv.updated_at}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="messages-list">
        <h3>Mensagens</h3>
        {msgLoading && <p>Carregando...</p>}
        {msgError && <p>Erro: {msgError}</p>}
        <ul>
          {messages.map((msg) => (
            <li key={msg.id}>
              <b>{msg.sender}:</b> {msg.body}
              <span style={{ fontSize: '0.8em', color: '#888' }}>{msg.created_at}</span>
            </li>
          ))}
        </ul>
        {selectedConversationId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
            />
            <button type="submit">Enviar</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;
