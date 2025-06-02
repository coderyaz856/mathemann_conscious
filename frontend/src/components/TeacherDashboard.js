import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    FaBook, FaUserGraduate, FaChartBar, FaEdit, FaPlus, FaTrash, FaEye, 
    FaCheck, FaTimes, FaUsers, FaClipboardList, FaCog, FaBrain, 
    FaUserCircle, FaPencilAlt, FaSearch, FaChartLine, FaBell, FaEnvelope,
    FaFilter, FaSort, FaDownload, FaCalendarAlt, FaStar, FaArchive,
    FaSync, FaExpand, FaCompress, FaLongArrowAltUp, FaAward, FaTarget,
    FaClock, FaGraduationCap, FaLightbulb, FaQuestionCircle, FaHeart,
    FaShare, FaFlag, FaBookmark, FaPrint, FaFileExport
} from 'react-icons/fa';
import MnemonicForm from './TeacherDashboard/MnemonicForm';
import '../styles/TeacherDashboard.css';
import MessagesPage from '../pages/MessagesPage';

// Composants utilitaires
const LoadingSpinner = ({ size = 'normal', text = 'Chargement...' }) => (
    <div className={`loading-container ${size}`}>
        <div className="spinner" />
        <span className="loading-text">{text}</span>
    </div>
);

const StatCard = ({ icon: Icon, title, value, trend, color = 'primary', onClick }) => (
    <div className={`stat-card ${color} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
        <div className="stat-icon">
            <Icon />
        </div>
        <div className="stat-content">
            <h3>{title}</h3>
            <div className="stat-value">{value}</div>
            {trend && (
                <div className={`stat-trend ${trend.type}`}>
                    <FaLongArrowAltUp />
                    <span>{trend.value}</span>
                </div>
            )}
        </div>
    </div>
);

const QuickActionButton = ({ icon: Icon, label, onClick, color = 'primary', badge }) => (
    <button className={`quick-action-btn ${color}`} onClick={onClick}>
        <Icon />
        <span>{label}</span>
        {badge && <span className="action-badge">{badge}</span>}
    </button>
);

const SearchFilter = ({ searchValue, onSearchChange, filterValue, onFilterChange, sortValue, onSortChange, filters, sorts }) => (
    <div className="search-filter-bar">
        <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
                type="text"
                placeholder="Rechercher..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="search-input"
            />
        </div>
        {filters && (
            <select value={filterValue} onChange={(e) => onFilterChange(e.target.value)} className="filter-select">
                {filters.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                ))}
            </select>
        )}
        {sorts && (
            <select value={sortValue} onChange={(e) => onSortChange(e.target.value)} className="sort-select">
                {sorts.map(sort => (
                    <option key={sort.value} value={sort.value}>{sort.label}</option>
                ))}
            </select>
        )}
    </div>
);

const NotificationToast = ({ message, type, onClose }) => (
    <div className={`notification-toast ${type}`}>
        <span>{message}</span>
        <button onClick={onClose}><FaTimes /></button>
    </div>
);

const TeacherDashboard = () => {
    // États principaux
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedDomains, setExpandedDomains] = useState({});
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [mnemonics, setMnemonics] = useState([]);
    const [loadingMnemonics, setLoadingMnemonics] = useState(false);
    const [showMnemonicForm, setShowMnemonicForm] = useState(false);
    const [editingMnemonic, setEditingMnemonic] = useState(null);
    const [mnemonicError, setMnemonicError] = useState(null);
    const [performanceData, setPerformanceData] = useState([]);
    const [performanceLoading, setPerformanceLoading] = useState(false);
    const [performanceError, setPerformanceError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // États pour les nouvelles fonctionnalités
    const [searchQueries, setSearchQueries] = useState({
        students: '',
        mnemonics: '',
        performance: ''
    });
    const [filters, setFilters] = useState({
        students: 'all',
        mnemonics: 'all',
        performance: 'all'
    });
    const [sortOptions, setSortOptions] = useState({
        students: 'name',
        mnemonics: 'recent',
        performance: 'recent'
    });
    const [toasts, setToasts] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItems, setSelectedItems] = useState({
        students: new Set(),
        mnemonics: new Set()
    });
    const [viewMode, setViewMode] = useState('grid'); // grid ou list
    const [analyticsData, setAnalyticsData] = useState(null);
    const [favoriteStudents, setFavoriteStudents] = useState(new Set());
    const navigate = useNavigate();

    // Fonctions utilitaires
    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Rafraîchir les données selon l'onglet actif
            switch (activeTab) {
                case 'students':
                    await fetchStudents();
                    break;
                case 'mnemonics':
                    await fetchMnemonics();
                    break;
                case 'performance':
                    await fetchPerformanceData();
                    break;
                default:
                    await fetchDashboardData();
            }
            showToast('Données mises à jour', 'success');
        } catch (err) {
            showToast('Erreur lors de la mise à jour', 'error');
        } finally {
            setRefreshing(false);
        }
    }, [activeTab]);

    // Chargement initial des données
    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Veuillez vous reconnecter');
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const [dashboardResponse, profileResponse, analyticsResponse] = await Promise.all([
                axios.get('http://localhost:5000/api/dashboard/teacher', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get('http://localhost:5000/api/users/profile', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get('http://localhost:5000/api/dashboard/teacher/analytics', {
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => ({ data: null })) // Analytics optionnel
            ]);

            if (dashboardResponse.data && dashboardResponse.data.ageRanges) {
                setDashboardData(dashboardResponse.data);
                const firstDomain = dashboardResponse.data.ageRanges.find(range =>
                    range.domains && range.domains.length > 0)?.domains[0];
                if (firstDomain?._id) {
                    setExpandedDomains({ [firstDomain._id]: true });
                }
            } else {
                setDashboardData({ ageRanges: [] });
            }

            setTeacherInfo(profileResponse.data);
            setAnalyticsData(analyticsResponse.data);
            setError(null);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.clear();
                setError('Votre session a expiré. Veuillez vous reconnecter.');
                navigate('/login');
            } else {
                setError('Erreur lors du chargement du tableau de bord.');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Fonctions de récupération des données avec gestion d'erreur améliorée
    const fetchStudents = useCallback(async () => {
        try {
            setStudentsLoading(true);
            const token = localStorage.getItem('token');
            const endpoint = selectedDomain 
                ? `http://localhost:5000/api/users/students/domain/${selectedDomain}`
                : 'http://localhost:5000/api/users/students';
            
            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const studentsWithProgress = (response.data || []).map(student => ({
                ...student,
                progress: Math.floor(Math.random() * 100),
                lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                totalQuizzes: Math.floor(Math.random() * 20),
                averageScore: Math.floor(Math.random() * 40) + 60
            }));
            
            setStudents(studentsWithProgress);
        } catch (error) {
            console.error('Error fetching students:', error);
            showToast('Erreur lors du chargement des étudiants', 'error');
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    }, [selectedDomain, showToast]);

    const fetchMnemonics = useCallback(async () => {
        setLoadingMnemonics(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/mnemonics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMnemonics(response.data || []);
        } catch (err) {
            console.error('Error fetching mnemonics:', err);
            setMnemonicError('Erreur lors du chargement des mnémoniques.');
            showToast('Erreur lors du chargement des mnémoniques', 'error');
        } finally {
            setLoadingMnemonics(false);
        }
    }, [showToast]);

    const fetchPerformanceData = useCallback(async () => {
        setPerformanceLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/dashboard/teacher/performance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerformanceData(response.data || []);
        } catch (err) {
            setPerformanceError('Erreur lors du chargement des données de performance.');
            showToast('Erreur lors du chargement des performances', 'error');
        } finally {
            setPerformanceLoading(false);
        }
    }, [showToast]);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/meetings/teacher/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data || []);
        } catch (err) {
            if (err.response?.status !== 404) {
                showToast('Erreur lors du chargement des notifications', 'error');
            }
        }
    }, [showToast]);

    // Chargement conditionnel des données
    useEffect(() => {
        switch (activeTab) {
            case 'students':
                fetchStudents();
                break;
            case 'mnemonics':
                fetchMnemonics();
                break;
            case 'performance':
                fetchPerformanceData();
                break;
            case 'notifications':
                fetchNotifications();
                break;
        }
    }, [activeTab, fetchStudents, fetchMnemonics, fetchPerformanceData, fetchNotifications]);

    // Données filtrées et triées avec useMemo pour les performances
    const filteredStudents = useMemo(() => {
        let filtered = students.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(searchQueries.students.toLowerCase()) ||
                                student.email.toLowerCase().includes(searchQueries.students.toLowerCase());
            const matchesFilter = filters.students === 'all' || 
                                (filters.students === 'active' && student.progress > 50) ||
                                (filters.students === 'favorites' && favoriteStudents.has(student._id));
            return matchesSearch && matchesFilter;
        });

        // Tri
        filtered.sort((a, b) => {
            switch (sortOptions.students) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'progress':
                    return b.progress - a.progress;
                case 'lastActive':
                    return new Date(b.lastActive) - new Date(a.lastActive);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [students, searchQueries.students, filters.students, sortOptions.students, favoriteStudents]);

    const filteredMnemonics = useMemo(() => {
        let filtered = mnemonics.filter(mnemonic => {
            const matchesSearch = mnemonic.title.toLowerCase().includes(searchQueries.mnemonics.toLowerCase()) ||
                                (mnemonic.tags && mnemonic.tags.some(tag => tag.toLowerCase().includes(searchQueries.mnemonics.toLowerCase())));
            return matchesSearch;
        });

        // Tri
        filtered.sort((a, b) => {
            switch (sortOptions.mnemonics) {
                case 'recent':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'usage':
                    return (b.assignedStudents?.length || 0) - (a.assignedStudents?.length || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [mnemonics, searchQueries.mnemonics, sortOptions.mnemonics]);

    // Gestionnaires d'événements améliorés
    const handleMnemonicSubmitSuccess = useCallback((savedMnemonic) => {
        if (editingMnemonic) {
            setMnemonics(prev => prev.map(m => m._id === savedMnemonic._id ? savedMnemonic : m));
            showToast('Mnémonique modifiée avec succès', 'success');
        } else {
            setMnemonics(prev => [savedMnemonic, ...prev]);
            showToast('Mnémonique créée avec succès', 'success');
        }
        setShowMnemonicForm(false);
        setEditingMnemonic(null);
    }, [editingMnemonic, showToast]);

    const handleDeleteMnemonic = useCallback(async (mnemonicId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette mnémonique ?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/mnemonics/${mnemonicId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMnemonics(prev => prev.filter(m => m._id !== mnemonicId));
            showToast('Mnémonique supprimée avec succès', 'success');
        } catch (err) {
            console.error('Error deleting mnemonic:', err);
            showToast('Erreur lors de la suppression', 'error');
        }
    }, [showToast]);

    const handleToggleFavoriteStudent = useCallback((studentId) => {
        setFavoriteStudents(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(studentId)) {
                newFavorites.delete(studentId);
                showToast('Étudiant retiré des favoris', 'info');
            } else {
                newFavorites.add(studentId);
                showToast('Étudiant ajouté aux favoris', 'success');
            }
            return newFavorites;
        });
    }, [showToast]);

    const handleMeetingRequest = useCallback(async (requestId, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/meetings/teacher/requests/${requestId}`, 
                { status }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchNotifications();
            showToast(`Demande de réunion ${status === 'accepted' ? 'acceptée' : 'rejetée'}`, 'success');
        } catch (err) {
            showToast('Erreur lors de la mise à jour de la demande', 'error');
        }
    }, [fetchNotifications, showToast]);

    const handleExportData = useCallback(() => {
        const dataToExport = {
            students: filteredStudents,
            mnemonics: filteredMnemonics,
            performance: performanceData,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `teacher-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showToast('Données exportées avec succès', 'success');
    }, [filteredStudents, filteredMnemonics, performanceData, showToast]);

    // Rendu des sections
    const renderOverview = () => (
        <div className="overview-section">
            {teacherInfo && (
                <div className="teacher-profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            <FaUserCircle />
                        </div>
                        <div className="profile-info">
                            <h2>Bienvenue, {teacherInfo.name}</h2>
                            <p className="profile-email">{teacherInfo.email}</p>
                            <div className="profile-badges">
                                <span className="role-badge">{teacherInfo.role}</span>
                                {teacherInfo.verified && <span className="verified-badge"><FaCheck /> Vérifié</span>}
                            </div>
                        </div>
                        <div className="profile-actions">
                            <button className="action-btn" onClick={() => navigate('/profile')}>
                                <FaEdit /> Modifier
                            </button>
                        </div>
                    </div>
                    {teacherInfo.domains && teacherInfo.domains.length > 0 && (
                        <div className="assigned-domains">
                            <h4><FaGraduationCap /> Vos domaines :</h4>
                            <div className="domain-chips">
                                {teacherInfo.domains.map((domain, index) => (
                                    <span key={index} className="domain-chip">
                                        {domain.name || domain}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="stats-grid">
                <StatCard
                    icon={FaBook}
                    title="Chapitres totaux"
                    value={dashboardData?.ageRanges?.reduce((total, range) =>
                        total + range.domains.reduce((sum, domain) =>
                            sum + (domain.chapters?.length || 0), 0), 0) || 0}
                    trend={{ type: 'positive', value: '+5%' }}
                    color="primary"
                    onClick={() => setActiveTab('content')}
                />
                <StatCard
                    icon={FaUserGraduate}
                    title="Étudiants actifs"
                    value={students.length}
                    trend={{ type: 'positive', value: '+12%' }}
                    color="success"
                    onClick={() => setActiveTab('students')}
                />
                <StatCard
                    icon={FaClipboardList}
                    title="Quiz créés"
                    value={dashboardData?.ageRanges?.reduce((total, range) =>
                        total + range.domains.reduce((sum, domain) =>
                            sum + (domain.chapters?.reduce((quizSum, chapter) =>
                                quizSum + (chapter.quizzes?.length || 0), 0) || 0), 0), 0) || 0}
                    trend={{ type: 'neutral', value: '0%' }}
                    color="info"
                />
                <StatCard
                    icon={FaBrain}
                    title="Mnémoniques"
                    value={mnemonics.length}
                    trend={{ type: 'positive', value: '+8%' }}
                    color="warning"
                    onClick={() => setActiveTab('mnemonics')}
                />
            </div>

            <div className="quick-actions-panel">
                <h3><FaLightbulb /> Actions rapides</h3>
                <div className="quick-actions-grid">
                    <QuickActionButton
                        icon={FaPlus}
                        label="Créer un quiz"
                        onClick={() => navigate('/quiz/create')}
                        color="primary"
                    />
                    <QuickActionButton
                        icon={FaBrain}
                        label="Nouvelle mnémonique"
                        onClick={() => {
                            setActiveTab('mnemonics');
                            setShowMnemonicForm(true);
                        }}
                        color="success"
                    />
                    <QuickActionButton
                        icon={FaUsers}
                        label="Voir les étudiants"
                        onClick={() => setActiveTab('students')}
                        color="info"
                        badge={students.length > 0 ? students.length : null}
                    />
                    <QuickActionButton
                        icon={FaBell}
                        label="Notifications"
                        onClick={() => setActiveTab('notifications')}
                        color="warning"
                        badge={notifications.length > 0 ? notifications.length : null}
                    />
                </div>
            </div>

            <div className="recent-activity-panel">
                <div className="panel-header">
                    <h3><FaClock /> Activité récente</h3>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                        <FaSync className={refreshing ? 'spinning' : ''} />
                    </button>
                </div>
                <div className="activity-timeline">
                    {performanceData
                        .filter(item => item.type === 'study')
                        .slice(0, 5)
                        .map((item, idx) => (
                        <div key={idx} className="activity-item">
                            <div className="activity-icon">
                                <FaBook />
                            </div>
                            <div className="activity-content">
                                <h4>{item.chapterName}</h4>
                                <p>Étudié par <strong>{item.studentName}</strong></p>
                                <span className="activity-time">
                                    {new Date(item.date).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                        </div>
                    ))}
                    {performanceData.filter(item => item.type === 'study').length === 0 && (
                        <div className="no-activity">
                            <FaQuestionCircle />
                            <p>Aucune activité récente dans vos domaines</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderStudents = () => (
        <div className="students-section">
            <div className="section-header">
                <div className="header-title">
                    <h2><FaUserGraduate /> Gestion des étudiants</h2>
                    <span className="item-count">{filteredStudents.length} étudiant(s)</span>
                </div>
                <div className="header-actions">
                    <button 
                        className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <FaCheck />
                    </button>
                    <button 
                        className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                    >
                        <FaClipboardList />
                    </button>
                    <button className="export-btn" onClick={handleExportData}>
                        <FaDownload /> Exporter
                    </button>
                </div>
            </div>

            <SearchFilter
                searchValue={searchQueries.students}
                onSearchChange={(value) => setSearchQueries(prev => ({ ...prev, students: value }))}
                filterValue={filters.students}
                onFilterChange={(value) => setFilters(prev => ({ ...prev, students: value }))}
                sortValue={sortOptions.students}
                onSortChange={(value) => setSortOptions(prev => ({ ...prev, students: value }))}
                filters={[
                    { value: 'all', label: 'Tous les étudiants' },
                    { value: 'active', label: 'Étudiants actifs' },
                    { value: 'favorites', label: 'Favoris' }
                ]}
                sorts={[
                    { value: 'name', label: 'Nom' },
                    { value: 'progress', label: 'Progression' },
                    { value: 'lastActive', label: 'Dernière activité' }
                ]}
            />

            {studentsLoading ? (
                <LoadingSpinner text="Chargement des étudiants..." />
            ) : (
                <div className={`students-container ${viewMode}`}>
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                            <div key={student._id} className="student-card enhanced">
                                <div className="card-header">
                                    <div className="student-avatar">
                                        {student.name[0].toUpperCase()}
                                        {favoriteStudents.has(student._id) && (
                                            <div className="favorite-indicator">
                                                <FaHeart />
                                            </div>
                                        )}
                                    </div>
                                    <div className="student-info">
                                        <h3>{student.name}</h3>
                                        <p className="student-email">{student.email}</p>
                                        {student.domain && (
                                            <span className="domain-tag">{student.domain}</span>
                                        )}
                                    </div>
                                    <div className="card-actions">
                                        <button
                                            className={`favorite-btn ${favoriteStudents.has(student._id) ? 'active' : ''}`}
                                            onClick={() => handleToggleFavoriteStudent(student._id)}
                                        >
                                            <FaHeart />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="student-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Progression</span>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${student.progress}%` }}
                                            />
                                        </div>
                                        <span className="stat-value">{student.progress}%</span>
                                    </div>
                                    
                                    <div className="stats-row">
                                        <div className="mini-stat">
                                            <FaClipboardList />
                                            <span>{student.totalQuizzes || 0} quiz</span>
                                        </div>
                                        <div className="mini-stat">
                                            <FaAward />
                                            <span>{student.averageScore || 0}% moy.</span>
                                        </div>
                                        <div className="mini-stat">
                                            <FaClock />
                                            <span>{new Date(student.lastActive).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <button 
                                        className="action-btn primary"
                                        onClick={() => navigate(`/student/${student._id}`)}
                                    >
                                        <FaEye /> Voir détails
                                    </button>
                                    <button 
                                        className="action-btn secondary"
                                        onClick={() => navigate('/messages', { state: { recipientId: student._id } })}
                                    >
                                        <FaEnvelope /> Message
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <FaUserGraduate className="empty-icon" />
                            <h3>Aucun étudiant trouvé</h3>
                            <p>Aucun étudiant ne correspond à vos critères de recherche.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderMnemonics = () => (
        <div className="mnemonics-section">
            <div className="section-header">
                <div className="header-title">
                    <h2><FaBrain /> Gestion des mnémoniques</h2>
                    <span className="item-count">{filteredMnemonics.length} mnémonique(s)</span>
                </div>
                <div className="header-actions">
                    {!showMnemonicForm && (
                        <button
                            className="primary-btn"
                            onClick={() => setShowMnemonicForm(true)}
                        >
                            <FaPlus /> Créer une mnémonique
                        </button>
                    )}
                </div>
            </div>

            {mnemonicError && (
                <div className="error-banner">
                    <FaTimes className="error-icon" />
                    <span>{mnemonicError}</span>
                    <button onClick={() => setMnemonicError(null)}>
                        <FaTimes />
                    </button>
                </div>
            )}

            {showMnemonicForm ? (
                <div className="form-container">
                    <MnemonicForm
                        initialData={editingMnemonic}
                        onSubmitSuccess={handleMnemonicSubmitSuccess}
                        onCancel={() => {
                            setShowMnemonicForm(false);
                            setEditingMnemonic(null);
                        }}
                    />
                </div>
            ) : (
                <>
                    <SearchFilter
                        searchValue={searchQueries.mnemonics}
                        onSearchChange={(value) => setSearchQueries(prev => ({ ...prev, mnemonics: value }))}
                        sortValue={sortOptions.mnemonics}
                        onSortChange={(value) => setSortOptions(prev => ({ ...prev, mnemonics: value }))}
                        sorts={[
                            { value: 'recent', label: 'Plus récentes' },
                            { value: 'title', label: 'Titre' },
                            { value: 'usage', label: 'Utilisation' }
                        ]}
                    />

                    <div className="mnemonics-container">
                        {loadingMnemonics ? (
                            <LoadingSpinner text="Chargement des mnémoniques..." />
                        ) : filteredMnemonics.length > 0 ? (
                            <div className="mnemonics-grid">
                                {filteredMnemonics.map(mnemonic => (
                                    <div key={mnemonic._id} className="mnemonic-card enhanced">
                                        <div className="card-header">
                                            <h3>{mnemonic.title}</h3>
                                            <div className="card-actions">
                                                <button
                                                    className="action-btn"
                                                    onClick={() => {
                                                        setEditingMnemonic(mnemonic);
                                                        setShowMnemonicForm(true);
                                                    }}
                                                >
                                                    <FaPencilAlt />
                                                </button>
                                                <button
                                                    className="action-btn danger"
                                                    onClick={() => handleDeleteMnemonic(mnemonic._id)}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div 
                                            className="mnemonic-content"
                                            dangerouslySetInnerHTML={{ __html: mnemonic.content }}
                                        />
                                        
                                        <div className="mnemonic-meta">
                                            {mnemonic.relatedChapter && (
                                                <div className="meta-item">
                                                    <FaBook />
                                                    <span>{mnemonic.relatedChapter.name}</span>
                                                </div>
                                            )}
                                            {mnemonic.relatedDomain && (
                                                <div className="meta-item">
                                                    <FaGraduationCap />
                                                    <span>{mnemonic.relatedDomain.name}</span>
                                                </div>
                                            )}
                                            {mnemonic.tags?.length > 0 && (
                                                <div className="meta-item tags">
                                                    <FaFlag />
                                                    <div className="tag-list">
                                                        {mnemonic.tags.map((tag, index) => (
                                                            <span key={index} className="tag">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {mnemonic.assignedStudents && mnemonic.assignedStudents.length > 0 && (
                                            <div className="assigned-students">
                                                <div className="assigned-header">
                                                    <FaUsers />
                                                    <span>Assigné à {mnemonic.assignedStudents.length} étudiant(s)</span>
                                                </div>
                                                <div className="student-avatars">
                                                    {mnemonic.assignedStudents.slice(0, 3).map(student => (
                                                        <div key={student._id} className="mini-avatar" title={student.name}>
                                                            {student.name[0].toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {mnemonic.assignedStudents.length > 3 && (
                                                        <div className="mini-avatar more">
                                                            +{mnemonic.assignedStudents.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <FaBrain className="empty-icon" />
                                <h3>Aucune mnémonique trouvée</h3>
                                <p>Vous n'avez pas encore créé de mnémoniques.</p>
                                <button 
                                    className="primary-btn"
                                    onClick={() => setShowMnemonicForm(true)}
                                >
                                    <FaPlus /> Créer la première
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const renderPerformance = () => (
        <div className="performance-section">
            <div className="section-header">
                <div className="header-title">
                    <h2><FaChartLine /> Performances des étudiants</h2>
                    <span className="item-count">{performanceData.length} enregistrement(s)</span>
                </div>
                <div className="header-actions">
                    <button className="export-btn" onClick={handleExportData}>
                        <FaDownload /> Exporter
                    </button>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                        <FaSync className={refreshing ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {performanceError && (
                <div className="error-banner">
                    <FaTimes className="error-icon" />
                    <span>{performanceError}</span>
                </div>
            )}

            {performanceLoading ? (
                <LoadingSpinner text="Chargement des performances..." />
            ) : performanceData.length > 0 ? (
                <div className="performance-container">
                    <div className="performance-grid">
                        {performanceData.map((item, idx) => (
                            <div key={idx} className="performance-card">
                                <div className="card-header">
                                    <div className="student-avatar">
                                        {item.studentName[0].toUpperCase()}
                                    </div>
                                    <div className="student-info">
                                        <h3>{item.studentName}</h3>
                                        <p className="student-email">{item.studentEmail}</p>
                                        <span className="domain-tag">{item.domainName}</span>
                                    </div>
                                    <div className="performance-type">
                                        {item.type === 'quiz' ? <FaClipboardList /> : <FaBook />}
                                    </div>
                                </div>
                                
                                <div className="performance-content">
                                    {item.type === 'quiz' ? (
                                        <div className="quiz-performance">
                                            <h4>{item.quizTitle}</h4>
                                            <div className="score-display">
                                                <div className="score-circle">
                                                    <span className="score-value">{item.score}%</span>
                                                </div>
                                                <div className="score-details">
                                                    <span>{item.correct}/{item.total} correct</span>
                                                    <span className={`score-grade ${item.score >= 80 ? 'excellent' : item.score >= 60 ? 'good' : 'needs-improvement'}`}>
                                                        {item.score >= 80 ? 'Excellent' : item.score >= 60 ? 'Bien' : 'À améliorer'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="study-performance">
                                            <h4>{item.chapterName}</h4>
                                            <div className="study-indicator">
                                                <FaBook />
                                                <span>Chapitre étudié</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="performance-meta">
                                        <span className="performance-date">
                                            <FaClock />
                                            {new Date(item.date).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    <FaChartLine className="empty-icon" />
                    <h3>Aucune donnée de performance</h3>
                    <p>Aucune activité récente n'a été enregistrée dans vos domaines.</p>
                </div>
            )}
        </div>
    );

    const renderNotifications = () => (
        <div className="notifications-section">
            <div className="section-header">
                <div className="header-title">
                    <h2><FaBell /> Demandes de réunion</h2>
                    <span className="item-count">{notifications.length} demande(s)</span>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="empty-state">
                    <FaBell className="empty-icon" />
                    <h3>Aucune demande de réunion</h3>
                    <p>Vous n'avez aucune demande de réunion en attente.</p>
                </div>
            ) : (
                <div className="notifications-container">
                    {notifications.map(req => (
                        <div key={req._id} className="notification-card">
                            <div className="notification-header">
                                <div className="student-avatar">
                                    {(req.student?.name || 'S')[0].toUpperCase()}
                                </div>
                                <div className="notification-info">
                                    <h3>Demande de réunion</h3>
                                    <p>De <strong>{req.student?.name || 'Étudiant'}</strong></p>
                                    {req.relatedDomain && (
                                        <span className="domain-tag">{req.relatedDomain.name}</span>
                                    )}
                                </div>
                                <div className="notification-time">
                                    <FaClock />
                                    <span>{new Date(req.requestedTime).toLocaleDateString('fr-FR')}</span>
                                </div>
                            </div>
                            
                            <div className="notification-content">
                                <div className="requested-time">
                                    <FaCalendarAlt />
                                    <span>
                                        Horaire souhaité : {new Date(req.requestedTime).toLocaleString('fr-FR')}
                                    </span>
                                </div>
                                {req.message && (
                                    <div className="message-content">
                                        <p>"{req.message}"</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="notification-actions">
                                <button 
                                    className="action-btn success"
                                    onClick={() => handleMeetingRequest(req._id, 'accepted')}
                                >
                                    <FaCheck /> Accepter
                                </button>
                                <button 
                                    className="action-btn danger"
                                    onClick={() => handleMeetingRequest(req._id, 'rejected')}
                                >
                                    <FaTimes /> Rejeter
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderMessages = () => (
        <div className="messages-wrapper">
            <MessagesPage userRole="teacher" />
        </div>
    );

    // Raccourcis clavier
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        handleRefresh();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (activeTab === 'mnemonics') {
                            setShowMnemonicForm(true);
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        document.querySelector('.search-input')?.focus();
                        break;
                    case 'e':
                        e.preventDefault();
                        handleExportData();
                        break;
                }
            }
            if (e.key === 'Escape') {
                setIsFullscreen(false);
                setShowMnemonicForm(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [activeTab, handleRefresh, handleExportData]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <LoadingSpinner size="large" text="Chargement du tableau de bord..." />
            </div>
        );
    }

    if (error && !dashboardData) {
        return (
            <div className="dashboard-error">
                <div className="error-content">
                    <FaTimes className="error-icon" />
                    <h2>Erreur de chargement</h2>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchDashboardData}>
                        <FaSync /> Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`teacher-dashboard ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Notifications Toast */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <NotificationToast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    />
                ))}
            </div>

            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Tableau de bord enseignant</h1>
                    <div className="header-actions">
                        <button 
                            className="fullscreen-btn"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                        >
                            {isFullscreen ? <FaCompress /> : <FaExpand />}
                        </button>
                        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                            <FaSync className={refreshing ? 'spinning' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-layout">
                <nav className="sidebar">
                    <div className="sidebar-content">
                        <button
                            className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            <FaChartBar />
                            <span>Aperçu</span>
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'students' ? 'active' : ''}`}
                            onClick={() => setActiveTab('students')}
                        >
                            <FaUserGraduate />
                            <span>Étudiants</span>
                            {students.length > 0 && <span className="tab-badge">{students.length}</span>}
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'mnemonics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mnemonics')}
                        >
                            <FaBrain />
                            <span>Mnémoniques</span>
                            {mnemonics.length > 0 && <span className="tab-badge">{mnemonics.length}</span>}
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'performance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('performance')}
                        >
                            <FaChartLine />
                            <span>Performance</span>
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'messages' ? 'active' : ''}`}
                            onClick={() => setActiveTab('messages')}
                        >
                            <FaEnvelope />
                            <span>Messages</span>
                            {unreadCount > 0 && <span className="tab-badge unread">{unreadCount}</span>}
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <FaBell />
                            <span>Notifications</span>
                            {notifications.length > 0 && <span className="tab-badge notification">{notifications.length}</span>}
                        </button>
                    </div>
                    
                    <div className="sidebar-footer">
                        <div className="keyboard-shortcuts">
                            <h4>Raccourcis</h4>
                            <div className="shortcut-list">
                                <div><kbd>Ctrl+R</kbd> Actualiser</div>
                                <div><kbd>Ctrl+F</kbd> Rechercher</div>
                                <div><kbd>Ctrl+N</kbd> Nouveau</div>
                                <div><kbd>Esc</kbd> Fermer</div>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="main-content">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'students' && renderStudents()}
                    {activeTab === 'mnemonics' && renderMnemonics()}
                    {activeTab === 'performance' && renderPerformance()}
                    {activeTab === 'messages' && renderMessages()}
                    {activeTab === 'notifications' && renderNotifications()}
                </main>
            </div>
        </div>
    );
};

export default TeacherDashboard;