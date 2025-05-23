import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { Send, Smile, Paperclip, Users, Hash, Lock, Copy, UserPlus, X } from 'lucide-react'
import axios from 'axios'
import Message from './Message'
import toast from 'react-hot-toast'

const ChatWindow = ({ room }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [typing, setTyping] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const { user } = useAuth()
  const { socket, onlineUsers } = useSocket()

  useEffect(() => {
    fetchMessages()
  }, [room._id])

  useEffect(() => {
    if (socket) {
      socket.on('new-message', (message) => {
        if (message.chatRoom === room._id) {
          setMessages(prev => [...prev, message])
        }
      })

      socket.on('user-typing', ({ userId, username }) => {
        if (userId !== user.id) {
          setTyping(prev => [...prev.filter(u => u.id !== userId), { id: userId, username }])
        }
      })

      socket.on('user-stop-typing', (userId) => {
        setTyping(prev => prev.filter(u => u.id !== userId))
      })

      return () => {
        socket.off('new-message')
        socket.off('user-typing')
        socket.off('user-stop-typing')
      }
    }
  }, [socket, room._id, user.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/chatrooms/${room._id}/messages`)
      setMessages(response.data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const messageData = {
      content: newMessage.trim(),
      sender: user.id,
      chatRoom: room._id
    }

    socket.emit('send-message', messageData)
    setNewMessage('')

    // Stop typing indicator
    socket.emit('stop-typing', { chatRoom: room._id, userId: user.id })
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    if (socket) {
      socket.emit('typing', {
        chatRoom: room._id,
        userId: user.id,
        username: user.username
      })

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { chatRoom: room._id, userId: user.id })
      }, 1000)
    }
  }

  const getOnlineMembers = () => {
    return room.members.filter(member => onlineUsers.includes(member._id))
  }

  const copyRoomCode = () => {
    if (room.roomCode) {
      navigator.clipboard.writeText(room.roomCode)
      toast.success('Room code copied to clipboard!')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {room.isPrivate ? (
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Hash className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-semibold text-white">{room.name}</h3>
                {room.isPrivate && room.roomCode && (
                  <button
                    onClick={copyRoomCode}
                    className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded flex items-center space-x-1 hover:bg-yellow-600/30 transition-colors"
                    title="Copy room code"
                  >
                    <span>{room.roomCode}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                {getOnlineMembers().length} online • {room.members.length} members
                {room.isPrivate && <span className="text-yellow-400"> • Private</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {getOnlineMembers().slice(0, 5).map((member) => (
                <div
                  key={member._id}
                  className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-gray-900"
                  title={member.username}
                >
                  {member.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {getOnlineMembers().length > 5 && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-gray-900">
                  +{getOnlineMembers().length - 5}
                </div>
              )}
            </div>
            {room.isPrivate && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                title="Invite users"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowMembersModal(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              title="View members"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message._id} message={message} currentUser={user} />
        ))}

        {/* Typing Indicator */}
        {typing.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typing.map(user => user.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/5 backdrop-blur-md border-t border-white/10 p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <textarea
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                rows="1"
                className="w-full p-3 pr-12 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none max-h-32"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                <button
                  type="button"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 transform hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          room={room}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <MembersModal
          room={room}
          onlineUsers={onlineUsers}
          currentUser={user}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  )
}

// Invite Modal Component
const InviteModal = ({ room, onClose }) => {
  const [inviteCode, setInviteCode] = useState('')
  const [shareLink, setShareLink] = useState('')

  useEffect(() => {
    // Generate invite link
    const baseUrl = window.location.origin
    const link = `${baseUrl}/join/${room._id}`
    setShareLink(link)
    setInviteCode(room.roomCode || room._id)
  }, [room])

  const copyInviteLink = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success('Invite link copied to clipboard!')
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    toast.success('Invite code copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Invite to {room.name}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Invite Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              />
              <button
                onClick={copyInviteLink}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Code
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inviteCode}
                readOnly
                className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-mono"
              />
              <button
                onClick={copyInviteCode}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Share this link or room code with others to invite them to this private room.
          </div>
        </div>
      </div>
    </div>
  )
}

// Members Modal Component
const MembersModal = ({ room, onlineUsers, currentUser, onClose }) => {
  const isUserOnline = (userId) => onlineUsers.includes(userId)
  const isCreator = (userId) => room.creator._id === userId || room.creator === userId

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-md max-h-96">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Room Members</h2>
            <p className="text-gray-400 text-sm">
              {room.members.length} members • {onlineUsers.filter(userId => room.members.some(member => member._id === userId)).length} online
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-80">
          <div className="space-y-3">
            {room.members.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(member._id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{member.username}</p>
                      {member._id === currentUser.id && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">You</span>
                      )}
                      {isCreator(member._id) && (
                        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">Creator</span>
                      )}
                    </div>
                    <p className={`text-sm ${isUserOnline(member._id) ? 'text-green-400' : 'text-gray-500'}`}>
                      {isUserOnline(member._id) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Optional: Add action buttons for room creators */}
                {isCreator(currentUser.id) && member._id !== currentUser.id && (
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove member"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Room Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-white font-medium mb-2">Room Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{room.isPrivate ? 'Private' : 'Public'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created by:</span>
                <span className="text-white">{room.creator.username || 'Unknown'}</span>
              </div>
              {room.description && (
                <div>
                  <span className="text-gray-400">Description:</span>
                  <p className="text-white mt-1">{room.description}</p>
                </div>
              )}
              {room.isPrivate && room.roomCode && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Room Code:</span>
                  <span className="text-yellow-400 font-mono">{room.roomCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatWindow