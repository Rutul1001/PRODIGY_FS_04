import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { Plus, Search, Settings, LogOut, Hash, Lock, Users, Globe, X, Key, Mail } from 'lucide-react'
import CreateRoomModal from './CreateRoomModal'
import axios from 'axios'
import toast from 'react-hot-toast'

const Sidebar = ({ chatRooms, selectedRoom, onRoomSelect, onCreateRoom, onShowProfile }) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showPrivateJoinModal, setShowPrivateJoinModal] = useState(false)
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableRooms, setAvailableRooms] = useState([])
  const [invitations, setInvitations] = useState([])
  const { user, logout } = useAuth()
  const { onlineUsers } = useSocket()

  const filteredRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getOnlineMembersCount = (room) => {
    return room.members.filter(member => onlineUsers.includes(member._id)).length
  }

  const fetchAvailableRooms = async () => {
    try {
      const response = await axios.get('/api/chatrooms/available')
      setAvailableRooms(response.data)
    } catch (error) {
      console.error('Error fetching available rooms:', error)
    }
  }

  const handleJoinRoom = async (roomId) => {
    try {
      const response = await axios.post(`/api/chatrooms/${roomId}/join`)
      onCreateRoom(response.data)
      setShowJoinModal(false)
      toast.success('Joined room successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join room')
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await axios.get('/api/chatrooms/invitations')
      setInvitations(response.data)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  const handleInvitationAction = async (roomId, action) => {
    try {
      const response = await axios.post(`/api/chatrooms/invitations/${roomId}/${action}`)
      if (action === 'accept' && response.data.room) {
        onCreateRoom(response.data.room)
      }
      toast.success(`Invitation ${action}ed successfully!`)
      fetchInvitations() // Refresh invitations
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} invitation`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">ChatSphere</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchInvitations()
                setShowInvitationsModal(true)
              }}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              title="Invitations"
            >
              <Mail className="w-5 h-5" />
              {invitations.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>
            <button
              onClick={onShowProfile}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <div>
            <p className="text-white font-medium">{user?.username}</p>
            <p className="text-green-400 text-sm">Online</p>
          </div>
        </div>
      </div>

      {/* Chat Rooms */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Chat Rooms</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPrivateJoinModal(true)}
                className="p-2 text-yellow-400 hover:text-white hover:bg-yellow-500/20 rounded-lg transition-all duration-200"
                title="Join Private Room"
              >
                <Key className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  fetchAvailableRooms()
                  setShowJoinModal(true)
                }}
                className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                title="Join Public Room"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                title="Create Room"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredRooms.map((room) => (
              <div
                key={room._id}
                onClick={() => onRoomSelect(room)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedRoom?._id === room._id
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : 'hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {room.isPrivate ? (
                      <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Hash className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{room.name}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Users className="w-3 h-3" />
                      <span>{getOnlineMembersCount(room)} online</span>
                      <span>•</span>
                      <span>{room.members.length} members</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={onCreateRoom}
        />
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <JoinRoomModal
          rooms={availableRooms}
          onClose={() => setShowJoinModal(false)}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {/* Private Room Join Modal */}
      {showPrivateJoinModal && (
        <PrivateJoinModal
          onClose={() => setShowPrivateJoinModal(false)}
          onJoinRoom={onCreateRoom}
        />
      )}

      {/* Invitations Modal */}
      {showInvitationsModal && (
        <InvitationsModal
          invitations={invitations}
          onClose={() => setShowInvitationsModal(false)}
          onInvitationAction={handleInvitationAction}
        />
      )}
    </div>
  )
}

// Join Room Modal Component
const JoinRoomModal = ({ rooms, onClose, onJoinRoom }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-md max-h-96">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Join a Room</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-80">
          {rooms.length === 0 ? (
            <p className="text-gray-400 text-center">No available rooms to join</p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room._id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Hash className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{room.name}</p>
                        <p className="text-gray-400 text-sm">{room.members.length} members</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onJoinRoom(room._id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

// Private Room Join Modal
const PrivateJoinModal = ({ onClose, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!roomCode.trim()) return

    setLoading(true)
    try {
      const response = await axios.post('/api/chatrooms/join-private', { roomCode: roomCode.toUpperCase() })
      onJoinRoom(response.data)
      toast.success('Joined private room successfully!')
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join private room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Join Private Room</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleJoin} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter 6-digit room code"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 uppercase"
              maxLength={6}
              required
            />
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !roomCode.trim()} className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 text-white rounded-lg transition-all duration-200">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Invitations Modal
const InvitationsModal = ({ invitations, onClose, onInvitationAction }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-md max-h-96">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Room Invitations</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-80">
          {invitations.length === 0 ? (
            <p className="text-gray-400 text-center">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.roomId} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="mb-3">
                    <h3 className="text-white font-medium">{invitation.roomName}</h3>
                    <p className="text-gray-400 text-sm">Invited by {invitation.invitedBy.username}</p>
                    {invitation.roomDescription && (
                      <p className="text-gray-300 text-sm mt-1">{invitation.roomDescription}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onInvitationAction(invitation.roomId, 'accept')}
                      className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onInvitationAction(invitation.roomId, 'decline')}
                      className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
