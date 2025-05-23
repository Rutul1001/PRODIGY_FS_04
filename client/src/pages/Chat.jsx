import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import UserProfile from '../components/UserProfile'
import axios from 'axios'

const Chat = () => {
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const { user } = useAuth()
  const { socket } = useSocket()

  useEffect(() => {
    fetchChatRooms()
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on('new-chatroom', (chatRoom) => {
        setChatRooms(prev => [...prev, chatRoom])
      })

      return () => {
        socket.off('new-chatroom')
      }
    }
  }, [socket])

  const fetchChatRooms = async () => {
    try {
      const response = await axios.get('/api/chatrooms')
      setChatRooms(response.data)
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    }
  }

  const handleRoomSelect = (room) => {
    setSelectedRoom(room)
    if (socket) {
      socket.emit('join-room', room._id)
    }
  }

  const handleCreateRoom = (newRoom) => {
    setChatRooms(prev => [...prev, newRoom])
    setSelectedRoom(newRoom)
  }

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-indigo-900/50 to-purple-900/50 backdrop-blur-md border-r border-white/10">
        <Sidebar
          chatRooms={chatRooms}
          selectedRoom={selectedRoom}
          onRoomSelect={handleRoomSelect}
          onCreateRoom={handleCreateRoom}
          onShowProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatWindow room={selectedRoom} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                <span className="text-4xl">💬</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to ChatSphere!
              </h2>
              <p className="text-gray-400 text-lg">
                Select a chat room to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}

export default Chat
