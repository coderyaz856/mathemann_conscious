import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ConversationList from '../components/Messages/ConversationList';
import MessageWindow from '../components/Messages/MessageWindow';
import MeetingRequestForm from '../components/MeetingRequestForm';
import MeetingRequestList from '../components/MeetingRequestList';
import { useNavigate, useLocation } from 'react-router-dom';
import MessagingService from '../services/MessagingService';
import WindowManager from '../services/WindowManager';
import io from 'socket.io-client';
import { 
    FaUsers, FaCalendarAlt, FaComments, FaPlus, FaSearch, 
    FaBell, FaCog, FaEllipsisV, FaFilter, FaSort, FaTimes,
    FaCheckDouble, FaCircle, FaPaperPlane, FaPhone, FaVideo,
    FaStar, FaArchive, FaEdit, FaTrash, FaFileAlt, FaImage,
    FaSmile, FaPaperclip, FaMicrophone, FaExpand, FaCompress
} from 'react-icons/fa';
import '../styles/Messages.css';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// Composant pour les notifications
const NotificationToast = ({ message, type, onClose }) => (
    <div className={`notification-toast ${type}`}>
        <div className="toast-content">
            <span>{message}</span>
            <button onClick={onClose} className="toast-close">
                <FaTimes />
            </button>
        </div>
    </div>
);

// Composant pour la barre de recherche
const SearchBar = ({ value, onChange, placeholder, onClear }) => (
    <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="search-input"
        />
        {value && (
            <button onClick={onClear} className="search-clear">
                <FaTimes />
            </button>
        )}
    </div>
);

// Composant pour les filtres
const FilterDropdown = ({ filters, activeFilter, onFilterChange, isOpen, onToggle }) => (
    <div className="filter-dropdown">
        <button className="filter-button" onClick={onToggle}>
            <FaFilter />
            <span>{filters.find(f => f.value === activeFilter)?.label || 'All'}</span>
        </button>
        {isOpen && (
            <div className="filter-menu">
                {filters.map(filter => (
                    <button
                        key={filter.value}
                        className={`filter-option ${activeFilter === filter.value ? 'active' : ''}`}
                        onClick={() => {
                            onFilterChange(filter.value);
                            onToggle();
                        }}
                    >
                        {filter.icon && <filter.icon />}
                        <span>{filter.label}</span>
                    </button>
                ))}
            </div>
        )}
    </div>
);

// Composant pour les actions rapides
const QuickActions = ({ onNewMessage, onNewMeeting, onSettings, hasUnread }) => (
    <div className="quick-actions">
        <button className="action-btn" onClick={onNewMessage} title="Nouveau message">
            <FaPlus />
        </button>
        <button className="action-btn" onClick={onNewMeeting} title="Nouvelle réunion">
            <FaCalendarAlt />
        </button>
        <button className="action-btn" onClick={onSettings} title="Paramètres">
            <FaCog />
        </button>
        {hasUnread && <div className="unread-indicator" />}
    </div>
);

// Composant pour l'état de connexion
const ConnectionStatus = ({ isConnected, isReconnecting }) => (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <FaCircle className="status-dot" />
        <span>
            {isReconnecting ? 'Reconnection...' : 
             isConnected ? 'En ligne' : 'Hors ligne'}
        </span>
    </div>
);

// Composant principal amélioré
const MessagesPage = () => {
    // États principaux
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('messages');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showNewMessageForm, setShowNewMessageForm] = useState(false);
    const [domains, setDomains] = useState([]);
    
    // Nouveaux états pour les améliorations
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState({
        isConnected: false,
        isReconnecting: false
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [lastSeen, setLastSeen] = useState({});
    
    // Refs
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // Filtres disponibles
    const conversationFilters = [
        { value: 'all', label: 'Toutes', icon: FaComments },
        { value: 'unread', label: 'Non lues', icon: FaBell },
        { value: 'starred', label: 'Favoris', icon: FaStar },
        { value: 'archived', label: 'Archivées', icon: FaArchive }
    ];

    // Fonction pour ajouter une notification
    const addNotification = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, duration);
    }, []);

    // Fonction pour supprimer une notification
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Conversations filtrées et recherchées
    const filteredConversations = useMemo(() => {
        let filtered = conversations;
        
        // Appliquer le filtre
        switch (activeFilter) {
            case 'unread':
                filtered = filtered.filter(conv => conv.unreadCount > 0);
                break;
            case 'starred':
                filtered = filtered.filter(conv => conv.isStarred);
                break;
            case 'archived':
                filtered = filtered.filter(conv => conv.isArchived);
                break;
            default:
                filtered = filtered.filter(conv => !conv.isArchived);
        }
        
        // Appliquer la recherche
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(conv => {
                const participant = conv.participants.find(p => p._id !== currentUser?.id);
                return participant?.name.toLowerCase().includes(query) ||
                       conv.lastMessage?.content.toLowerCase().includes(query);
            });
        }
        
        return filtered;
    }, [conversations, activeFilter, searchQuery, currentUser]);

    // Compter les messages non lus
    useEffect(() => {
        const total = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
    }, [conversations]);

    // Récupération des informations utilisateur
    useEffect(() => {
        const fetchUserInfo = () => {
            const userId = localStorage.getItem('userId');
            const userName = localStorage.getItem('userName');
            const userRole = localStorage.getItem('userRole');
            if (userId && userName && userRole) {
                setCurrentUser({ id: userId, name: userName, role: userRole });
            } else {
                console.error("User info not found in local storage");
                navigate('/login');
            }
        };
        fetchUserInfo();
    }, [navigate]);

    // Initialisation de Socket.IO avec gestion améliorée
    useEffect(() => {
        if (!currentUser?.id) return;

        const initializeSocket = () => {
            socketRef.current = io(SOCKET_SERVER_URL, {
                query: { userId: currentUser.id },
                transports: ['websocket', 'polling']
            });

            const socket = socketRef.current;

            socket.on('connect', () => {
                console.log('Socket connected:', socket.id);
                setConnectionStatus({ isConnected: true, isReconnecting: false });
                socket.emit('join', currentUser.id);
                addNotification('Connecté au serveur de messagerie', 'success');
            });

            socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setConnectionStatus({ isConnected: false, isReconnecting: true });
                addNotification('Connexion perdue', 'warning');
            });

            socket.on('reconnect', () => {
                setConnectionStatus({ isConnected: true, isReconnecting: false });
                addNotification('Reconnecté', 'success');
            });

            socket.on('connect_error', (err) => {
                console.error("Socket connection error:", err);
                setConnectionStatus({ isConnected: false, isReconnecting: false });
                setError("Impossible de se connecter au service de messagerie.");
                addNotification('Erreur de connexion', 'error');
            });

            // Événements de messagerie
            socket.on('receiveMessage', (newMessage) => {
                console.log('Received message:', newMessage);
                
                if (newMessage.conversationId === selectedConversationId) {
                    setMessages(prevMessages => [...prevMessages, newMessage]);
                    // Marquer comme lu automatiquement si la conversation est ouverte
                    MessagingService.markAsRead(newMessage.conversationId);
                } else {
                    // Afficher une notification pour les nouveaux messages
                    const sender = newMessage.sender;
                    addNotification(`Nouveau message de ${sender.name}`, 'info');
                }
                
                // Mettre à jour la liste des conversations
                setConversations(prevConvs => 
                    prevConvs.map(conv => 
                        conv._id === newMessage.conversationId 
                        ? { 
                            ...conv, 
                            lastMessage: newMessage, 
                            updatedAt: newMessage.createdAt,
                            unreadCount: conv._id === selectedConversationId ? 0 : (conv.unreadCount || 0) + 1
                        }
                        : conv
                    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                );
            });

            // Événements de frappe
            socket.on('userTyping', ({ userId, conversationId, isTyping }) => {
                if (conversationId === selectedConversationId) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        if (isTyping) {
                            newSet.add(userId);
                        } else {
                            newSet.delete(userId);
                        }
                        return newSet;
                    });
                }
            });

            // Événements de présence
            socket.on('userOnline', (userId) => {
                setOnlineUsers(prev => new Set([...prev, userId]));
                setLastSeen(prev => ({ ...prev, [userId]: new Date() }));
            });

            socket.on('userOffline', (userId) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
                setLastSeen(prev => ({ ...prev, [userId]: new Date() }));
            });

            // Événements de réunions
            socket.on('meetingRequestUpdate', (updatedRequest) => {
                console.log('Meeting request updated:', updatedRequest);
                if (activeTab === 'meetings') {
                    addNotification('Demande de réunion mise à jour', 'info');
                }
            });

            // Événements de lecture
            socket.on('messageRead', ({ conversationId, userId }) => {
                if (conversationId === selectedConversationId) {
                    setMessages(prevMessages => 
                        prevMessages.map(msg => 
                            msg.sender._id === currentUser.id 
                            ? { ...msg, readBy: [...(msg.readBy || []), userId] }
                            : msg
                        )
                    );
                }
            });
        };

        initializeSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [currentUser, selectedConversationId, activeTab, addNotification]);

    // Gestion de la frappe
    const handleTyping = useCallback((isTyping) => {
        if (socketRef.current && selectedConversationId) {
            socketRef.current.emit('typing', {
                conversationId: selectedConversationId,
                isTyping
            });
        }
    }, [selectedConversationId]);

    // Scroll automatique vers le bas
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Récupération des conversations avec mise en cache
    useEffect(() => {
        const fetchConversations = async () => {
            if (!currentUser) return;
            
            try {
                setLoadingConversations(true);
                const fetchedConversations = await MessagingService.getConversations();
                setConversations(fetchedConversations);
                setError(null);

                // Gestion de la navigation directe vers une conversation
                const initialRecipientId = location.state?.recipientId;
                if (initialRecipientId && fetchedConversations.length > 0) {
                    const existingConv = fetchedConversations.find(conv => 
                        conv.participants.some(p => p._id === initialRecipientId)
                    );
                    if (existingConv) {
                        setSelectedConversationId(existingConv._id);
                        setActiveTab('messages');
                        WindowManager.openWindow('message');
                    }
                }
                
                navigate(location.pathname, { replace: true, state: {} });

            } catch (err) {
                console.error('Error fetching conversations:', err);
                setError('Échec du chargement des conversations.');
                addNotification('Erreur lors du chargement des conversations', 'error');
            } finally {
                setLoadingConversations(false);
            }
        };

        fetchConversations();
    }, [currentUser, navigate, location.state, location.pathname, addNotification]);

    // Récupération des messages avec optimisation
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedConversationId) return;
            
            try {
                setLoadingMessages(true);
                const messagesData = await MessagingService.getMessages(selectedConversationId);
                setMessages(messagesData);
                setError(null);
                
                // Marquer comme lu
                await MessagingService.markAsRead(selectedConversationId);
                
                // Mettre à jour le compteur non lu dans la conversation
                setConversations(prev => 
                    prev.map(conv => 
                        conv._id === selectedConversationId 
                        ? { ...conv, unreadCount: 0 }
                        : conv
                    )
                );
                
            } catch (err) {
                console.error('Error fetching messages:', err);
                setError('Échec du chargement des messages.');
                setMessages([]);
                addNotification('Erreur lors du chargement des messages', 'error');
            } finally {
                setLoadingMessages(false);
            }
        };

        if (selectedConversationId) {
            fetchMessages();
        }
    }, [selectedConversationId, addNotification]);
    
    // Récupération des utilisateurs disponibles
    useEffect(() => {
        const fetchAvailableUsers = async () => {
            if (!currentUser || !showNewMessageForm) return;
            
            try {
                const users = await MessagingService.getAvailableUsers();
                setAvailableUsers(users);
                
                // Extraction des domaines pour les demandes de réunion
                if (currentUser.role === 'student' && users.length > 0) {
                    const allDomains = users.reduce((acc, teacher) => {
                        if (teacher.domains) {
                            teacher.domains.forEach(domainId => {
                                if (!acc.some(d => d._id === domainId)) {
                                    acc.push({ _id: domainId, name: 'Domain ' + domainId.substr(-4) });
                                }
                            });
                        }
                        return acc;
                    }, []);
                    
                    setDomains(allDomains);
                }
            } catch (err) {
                console.error('Error fetching available users:', err);
                addNotification('Erreur lors du chargement des utilisateurs', 'error');
            }
        };
        
        fetchAvailableUsers();
    }, [currentUser, showNewMessageForm, addNotification]);

    // Gestionnaires d'événements améliorés
    const handleSelectConversation = useCallback((conversationId) => {
        setSelectedConversationId(conversationId);
        setShowNewMessageForm(false);
        setSelectedMessages(new Set());
        setIsMultiSelectMode(false);
        WindowManager.openWindow('message');
    }, []);

    const handleSendMessage = useCallback(async (recipientId, content, attachments = []) => {
        try {
            let conversationId = selectedConversationId;
            
            if (!conversationId) {
                const newConversation = await MessagingService.startOrGetConversation(recipientId);
                conversationId = newConversation._id;
                setSelectedConversationId(conversationId);
                
                if (!conversations.some(c => c._id === conversationId)) {
                    setConversations(prevConvs => [newConversation, ...prevConvs]);
                }
            }
            
            // Envoyer le message avec les pièces jointes
            const sentMessage = await MessagingService.sendMessage(recipientId, content, attachments);
            
            setMessages(prevMessages => [...prevMessages, sentMessage]);

            setConversations(prevConvs => 
                prevConvs.map(conv => 
                    conv._id === sentMessage.conversationId 
                    ? { ...conv, lastMessage: sentMessage, updatedAt: sentMessage.createdAt }
                    : conv
                ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            );

            addNotification('Message envoyé', 'success', 1000);

        } catch (err) {
            console.error('Error sending message:', err);
            setError('Échec de l\'envoi du message.');
            addNotification('Erreur lors de l\'envoi du message', 'error');
        }
    }, [selectedConversationId, conversations, addNotification]);
    
    const handleStartNewConversation = useCallback(() => {
        setSelectedConversationId(null);
        setMessages([]);
        setSelectedUser(null);
        setShowNewMessageForm(true);
        setSelectedMessages(new Set());
        setIsMultiSelectMode(false);
        WindowManager.openWindow('message');
    }, []);
    
    const handleSelectUserForNewMessage = useCallback((user) => {
        setSelectedUser(user);
    }, []);
    
    const handleRequestSent = useCallback(() => {
        setActiveTab('meetings');
        setShowNewMessageForm(false);
        WindowManager.closeAllWindows();
        addNotification('Demande de réunion envoyée', 'success');
    }, [addNotification]);

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setSearchQuery('');
        setActiveFilter('all');
        
        if (tab === 'messages') {
            if (selectedConversationId) {
                WindowManager.openWindow('message');
            } else {
                WindowManager.closeAllWindows();
            }
        } else if (tab === 'meetings') {
            setShowNewMessageForm(false);
            WindowManager.closeAllWindows();
        }
    }, [selectedConversationId]);

    // Actions avancées
    const handleStarConversation = useCallback(async (conversationId) => {
        try {
            await MessagingService.starConversation(conversationId);
            setConversations(prev => 
                prev.map(conv => 
                    conv._id === conversationId 
                    ? { ...conv, isStarred: !conv.isStarred }
                    : conv
                )
            );
            addNotification('Conversation marquée', 'success');
        } catch (err) {
            addNotification('Erreur lors du marquage', 'error');
        }
    }, [addNotification]);

    const handleArchiveConversation = useCallback(async (conversationId) => {
        try {
            await MessagingService.archiveConversation(conversationId);
            setConversations(prev => 
                prev.map(conv => 
                    conv._id === conversationId 
                    ? { ...conv, isArchived: !conv.isArchived }
                    : conv
                )
            );
            addNotification('Conversation archivée', 'success');
        } catch (err) {
            addNotification('Erreur lors de l\'archivage', 'error');
        }
    }, [addNotification]);

    const handleDeleteMessage = useCallback(async (messageId) => {
        try {
            await MessagingService.deleteMessage(messageId);
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
            addNotification('Message supprimé', 'success');
        } catch (err) {
            addNotification('Erreur lors de la suppression', 'error');
        }
    }, [addNotification]);

    // Raccourcis clavier
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        // Focus sur la barre de recherche
                        document.querySelector('.search-input')?.focus();
                        break;
                    case 'n':
                        e.preventDefault();
                        handleStartNewConversation();
                        break;
                    case 'Escape':
                        setIsFullscreen(false);
                        setIsMultiSelectMode(false);
                        setSelectedMessages(new Set());
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleStartNewConversation]);

    // Déterminer le destinataire de la conversation sélectionnée
    const selectedConversation = conversations.find(c => c._id === selectedConversationId);
    const recipient = selectedConversation?.participants.find(p => p._id !== currentUser?.id);

    return (
        <div className={`messages-page-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Notifications */}
            <div className="notifications-container">
                {notifications.map(notification => (
                    <NotificationToast
                        key={notification.id}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>

            <div className="messages-sidebar">
                {/* Header de la sidebar */}
                <div className="sidebar-header">
                    <div className="sidebar-title">
                        <h2>Messages</h2>
                        <ConnectionStatus 
                            isConnected={connectionStatus.isConnected}
                            isReconnecting={connectionStatus.isReconnecting}
                        />
                    </div>
                    <QuickActions
                        onNewMessage={handleStartNewConversation}
                        onNewMeeting={() => setActiveTab('meetings')}
                        onSettings={() => addNotification('Paramètres à venir', 'info')}
                        hasUnread={unreadCount > 0}
                    />
                </div>

                {/* Onglets */}
                <div className="messages-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
                        onClick={() => handleTabChange('messages')}
                    >
                        <FaComments />
                        <span>Messages</span>
                        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'meetings' ? 'active' : ''}`}
                        onClick={() => handleTabChange('meetings')}
                    >
                        <FaCalendarAlt />
                        <span>Réunions</span>
                    </button>
                </div>
                
                {activeTab === 'messages' && (
                    <div className="sidebar-content">
                        {/* Barre de recherche et filtres */}
                        <div className="search-filter-bar">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Rechercher conversations..."
                                onClear={() => setSearchQuery('')}
                            />
                            <FilterDropdown
                                filters={conversationFilters}
                                activeFilter={activeFilter}
                                onFilterChange={setActiveFilter}
                                isOpen={showFilterDropdown}
                                onToggle={() => setShowFilterDropdown(!showFilterDropdown)}
                            />
                        </div>
                        
                        <ConversationList 
                            conversations={filteredConversations}
                            onSelectConversation={handleSelectConversation}
                            selectedConversationId={selectedConversationId}
                            currentUser={currentUser}
                            onlineUsers={onlineUsers}
                            lastSeen={lastSeen}
                            onStarConversation={handleStarConversation}
                            onArchiveConversation={handleArchiveConversation}
                            searchQuery={searchQuery}
                        />
                    </div>
                )}
                
                {activeTab === 'meetings' && currentUser && (
                    <div className="sidebar-content">
                        <MeetingRequestList 
                            userRole={currentUser.role} 
                            onRequestClick={() => {
                                if (WindowManager.isWindowOpen('message')) {
                                    WindowManager.closeWindow('message');
                                }
                                WindowManager.openWindow('meeting');
                            }}
                        />
                    </div>
                )}
            </div>
            
            <div className="messages-main-content">
                {/* Actions de la fenêtre principale */}
                <div className="main-content-header">
                    {selectedConversation && (
                        <div className="conversation-actions">
                            <button 
                                className="action-btn"
                                onClick={() => handleStarConversation(selectedConversationId)}
                                title={selectedConversation.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                                <FaStar className={selectedConversation.isStarred ? 'starred' : ''} />
                            </button>
                            <button 
                                className="action-btn"
                                onClick={() => handleArchiveConversation(selectedConversationId)}
                                title="Archiver"
                            >
                                <FaArchive />
                            </button>
                            <button 
                                className="action-btn"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
                            >
                                {isFullscreen ? <FaCompress /> : <FaExpand />}
                            </button>
                        </div>
                    )}
                </div>

                {activeTab === 'messages' && !showNewMessageForm && (
                    <MessageWindow 
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        currentUser={currentUser}
                        recipient={recipient}
                        onTyping={handleTyping}
                        typingUsers={Array.from(typingUsers)}
                        onDeleteMessage={handleDeleteMessage}
                        selectedMessages={selectedMessages}
                        onSelectMessage={(messageId) => {
                            if (isMultiSelectMode) {
                                setSelectedMessages(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(messageId)) {
                                        newSet.delete(messageId);
                                    } else {
                                        newSet.add(messageId);
                                    }
                                    return newSet;
                                });
                            }
                        }}
                        isMultiSelectMode={isMultiSelectMode}
                        onToggleMultiSelect={() => setIsMultiSelectMode(!isMultiSelectMode)}
                        isConnected={connectionStatus.isConnected}
                    />
                )}
                
                {activeTab === 'messages' && showNewMessageForm && (
                    <div className="new-message-form">
                        <div className="form-header">
                            <h3><FaUsers /> Nouvelle conversation</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowNewMessageForm(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        {availableUsers.length === 0 ? (
                            <div className="empty-state">
                                <FaUsers className="empty-icon" />
                                <p>Aucun utilisateur disponible pour une conversation.</p>
                            </div>
                        ) : (
                            <>
                                <div className="user-selection">
                                    <SearchBar
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Rechercher un utilisateur..."
                                        onClear={() => setSearchQuery('')}
                                    />
                                    
                                    <div className="user-list">
                                        {availableUsers
                                            .filter(user => 
                                                user.name.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map(user => (
                                            <div 
                                                key={user._id}
                                                className={`user-item ${selectedUser?._id === user._id ? 'selected' : ''}`}
                                                onClick={() => handleSelectUserForNewMessage(user)}
                                            >
                                                <div className="user-avatar">
                                                    {user.name[0].toUpperCase()}
                                                    {onlineUsers.has(user._id) && (
                                                        <div className="online-indicator" />
                                                    )}
                                                </div>
                                                <div className="user-info">
                                                    <span className="user-name">{user.name}</span>
                                                    <span className="user-role">{user.role}</span>
                                                    {lastSeen[user._id] && !onlineUsers.has(user._id) && (
                                                        <span className="last-seen">
                                                            Vu {new Date(lastSeen[user._id]).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="user-actions">
                                                    <button 
                                                        className="quick-action"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Démarrer un appel vidéo
                                                            addNotification('Appel vidéo à venir', 'info');
                                                        }}
                                                        title="Appel vidéo"
                                                    >
                                                        <FaVideo />
                                                    </button>
                                                    <button 
                                                        className="quick-action"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Démarrer un appel audio
                                                            addNotification('Appel audio à venir', 'info');
                                                        }}
                                                        title="Appel audio"
                                                    >
                                                        <FaPhone />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {selectedUser && (
                                    <div className="compose-message">
                                        <div className="compose-header">
                                            <h4>Message à {selectedUser.name}</h4>
                                            <div className="recipient-status">
                                                {onlineUsers.has(selectedUser._id) ? (
                                                    <span className="status online">En ligne</span>
                                                ) : (
                                                    <span className="status offline">Hors ligne</span>
                                                )}
                                            </div>
                                        </div>
                                        <MessageWindow 
                                            messages={[]}
                                            onSendMessage={(_, content, attachments) => handleSendMessage(selectedUser._id, content, attachments)}
                                            currentUser={currentUser}
                                            recipient={selectedUser}
                                            onTyping={handleTyping}
                                            typingUsers={[]}
                                            isNewConversation={true}
                                            isConnected={connectionStatus.isConnected}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                
                {activeTab === 'meetings' && currentUser?.role === 'student' && (
                    <div className="meeting-request-section">
                        {selectedUser ? (
                            <div className="meeting-form-container">
                                <div className="form-header">
                                    <h3><FaCalendarAlt /> Planifier une réunion avec {selectedUser.name}</h3>
                                    <button 
                                        className="close-btn"
                                        onClick={() => {
                                            setSelectedUser(null);
                                            WindowManager.closeWindow('meeting');
                                        }}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                                <MeetingRequestForm 
                                    teacher={selectedUser}
                                    domains={domains}
                                    onRequestSent={handleRequestSent}
                                    onCancel={() => {
                                        setSelectedUser(null);
                                        WindowManager.closeWindow('meeting');
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="select-teacher">
                                <div className="empty-state">
                                    <FaCalendarAlt className="empty-icon" />
                                    <h3>Planifier une réunion</h3>
                                    <p>Sélectionnez un enseignant pour planifier une réunion :</p>
                                </div>
                                
                                <div className="teachers-grid">
                                    {availableUsers.length === 0 ? (
                                        <div className="loading-state">
                                            <div className="spinner"></div>
                                            <p>Chargement des enseignants disponibles...</p>
                                        </div>
                                    ) : (
                                        availableUsers.map(user => (
                                            <div 
                                                key={user._id}
                                                className="teacher-card"
                                                onClick={() => {
                                                    handleSelectUserForNewMessage(user);
                                                    WindowManager.openWindow('meeting');
                                                }}
                                            >
                                                <div className="teacher-avatar">
                                                    {user.name[0].toUpperCase()}
                                                    {onlineUsers.has(user._id) && (
                                                        <div className="online-indicator" />
                                                    )}
                                                </div>
                                                <div className="teacher-info">
                                                    <h4 className="teacher-name">{user.name}</h4>
                                                    <p className="teacher-subject">{user.subject || 'Enseignant'}</p>
                                                    <div className="teacher-status">
                                                        {onlineUsers.has(user._id) ? (
                                                            <span className="status online">
                                                                <FaCircle /> Disponible maintenant
                                                            </span>
                                                        ) : (
                                                            <span className="status offline">
                                                                <FaCircle /> Hors ligne
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="teacher-actions">
                                                    <button className="schedule-btn">
                                                        <FaCalendarAlt />
                                                        Planifier
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* État vide quand aucune conversation n'est sélectionnée */}
                {activeTab === 'messages' && !selectedConversationId && !showNewMessageForm && (
                    <div className="empty-conversation-state">
                        <div className="empty-content">
                            <FaComments className="empty-icon" />
                            <h3>Aucune conversation sélectionnée</h3>
                            <p>Choisissez une conversation existante ou démarrez une nouvelle discussion.</p>
                            <button 
                                className="start-conversation-btn"
                                onClick={handleStartNewConversation}
                            >
                                <FaPlus />
                                Nouvelle conversation
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* États de chargement et d'erreur */}
            {loadingConversations && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="spinner"></div>
                        <p>Chargement des conversations...</p>
                    </div>
                </div>
            )}
            
            {loadingMessages && (
                <div className="messages-loading-overlay">
                    <div className="loading-content">
                        <div className="spinner small"></div>
                        <span>Chargement des messages...</span>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="error-banner">
                    <div className="error-content">
                        <span>{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="error-close"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Référence pour le scroll automatique */}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessagesPage;