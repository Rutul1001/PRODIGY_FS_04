const Message = ({ message, currentUser }) => {
  const isOwnMessage = message.sender._id === currentUser.id
  
  // Simple time formatting without date-fns
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }
  
  const messageTime = formatTime(message.createdAt)

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slideIn`}>
      <div className={`flex items-end space-x-2 max-w-2xl lg:max-w-3xl min-w-0 w-auto ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!isOwnMessage && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {message.sender.username.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative px-6 py-2 rounded-3xl min-w-fit max-w-full ${
          isOwnMessage
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-lg'
            : 'bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-bl-lg'
        }`}>
          {/* Sender name for other users */}
          {!isOwnMessage && (
            <p className="text-xs font-semibold text-purple-300 mb-0.5">
              {message.sender.username}
            </p>
          )}
          
          <p className="text-sm leading-snug break-words whitespace-pre-wrap">
            {message.content}
          </p>
          
          <p className={`text-xs mt-1 ${
            isOwnMessage ? 'text-purple-100' : 'text-gray-400'
          }`}>
            {messageTime}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Message
