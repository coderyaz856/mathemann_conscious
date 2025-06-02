import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    FaArrowLeft, FaBookmark, FaShare, FaPrint, FaExpand, FaCompress,
    FaPlay, FaClock, FaQuestionCircle, FaLightbulb, FaBrain,
    FaEye, FaEyeSlash, FaTextHeight, FaFont, FaPalette, FaBookOpen,
    FaHeadphones, FaSearch, FaHighlighter, FaStickyNote, FaChartLine,
    FaAward, FaBullseye, FaGraduationCap, FaRocket, FaHeart, FaThumbsUp,
    FaComment, FaFlag, FaDownload, FaCopy, FaExternalLinkAlt, FaVolumeUp
} from 'react-icons/fa';
import '../styles/ChapterView.css';

// Composants utilitaires
const LoadingSpinner = ({ size = 'normal', text = 'Chargement du chapitre...' }) => (
    <div className={`chapter-loading ${size}`}>
        <div className="loading-spinner" />
        <p className="loading-text">{text}</p>
    </div>
);

const NotificationToast = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div className={`toast-notification ${type}`}>
            <span>{message}</span>
            <button onClick={onClose}>×</button>
        </div>
    );
};

const ReadingProgress = ({ progress }) => (
    <div className="reading-progress-bar">
        <div 
            className="reading-progress-fill" 
            style={{ width: `${progress}%` }}
        />
    </div>
);

const TableOfContents = ({ content, onSectionClick, activeSection }) => {
    const sections = useMemo(() => {
        if (!content) return [];
        const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        const matches = [];
        let match;
        
        while ((match = headingRegex.exec(content)) !== null) {
            matches.push({
                level: parseInt(match[1]),
                text: match[2].replace(/<[^>]*>/g, ''),
                id: `heading-${matches.length}`
            });
        }
        return matches;
    }, [content]);

    if (sections.length === 0) return null;

    return (
        <div className="table-of-contents">
            <h3><FaBookOpen /> Table des matières</h3>
            <ul className="toc-list">
                {sections.map((section, index) => (
                    <li 
                        key={index}
                        className={`toc-item level-${section.level} ${activeSection === index ? 'active' : ''}`}
                        onClick={() => onSectionClick(index)}
                    >
                        {section.text}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const StudyTimer = ({ onTimeUpdate }) => {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true);
    
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => {
                    const newTime = s + 1;
                    onTimeUpdate?.(newTime);
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, onTimeUpdate]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="study-timer">
            <FaClock />
            <span>{formatTime(seconds)}</span>
            <button 
                className={`timer-toggle ${isActive ? 'pause' : 'play'}`}
                onClick={() => setIsActive(!isActive)}
            >
                {isActive ? <FaEyeSlash /> : <FaEye />}
            </button>
        </div>
    );
};

const ReadingSettings = ({ settings, onSettingsChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="reading-settings">
            <button 
                className="settings-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <FaPalette />
            </button>
            
            {isOpen && (
                <div className="settings-panel">
                    <div className="setting-group">
                        <label>Taille du texte</label>
                        <div className="font-size-controls">
                            <button onClick={() => onSettingsChange({ fontSize: Math.max(12, settings.fontSize - 2) })}>
                                A-
                            </button>
                            <span>{settings.fontSize}px</span>
                            <button onClick={() => onSettingsChange({ fontSize: Math.min(24, settings.fontSize + 2) })}>
                                A+
                            </button>
                        </div>
                    </div>
                    
                    <div className="setting-group">
                        <label>Thème</label>
                        <div className="theme-controls">
                            <button 
                                className={settings.theme === 'light' ? 'active' : ''}
                                onClick={() => onSettingsChange({ theme: 'light' })}
                            >
                                Clair
                            </button>
                            <button 
                                className={settings.theme === 'dark' ? 'active' : ''}
                                onClick={() => onSettingsChange({ theme: 'dark' })}
                            >
                                Sombre
                            </button>
                            <button 
                                className={settings.theme === 'sepia' ? 'active' : ''}
                                onClick={() => onSettingsChange({ theme: 'sepia' })}
                            >
                                Sépia
                            </button>
                        </div>
                    </div>
                    
                    <div className="setting-group">
                        <label>Largeur de ligne</label>
                        <input
                            type="range"
                            min="1.2"
                            max="2.0"
                            step="0.1"
                            value={settings.lineHeight}
                            onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })}
                        />
                    </div>
                    
                    <div className="setting-group">
                        <label>Mode focus</label>
                        <button 
                            className={`focus-toggle ${settings.focusMode ? 'active' : ''}`}
                            onClick={() => onSettingsChange({ focusMode: !settings.focusMode })}
                        >
                            {settings.focusMode ? 'Activé' : 'Désactivé'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuizCard = ({ quiz, onStartQuiz, studyStats }) => {
    const difficulty = quiz.questions?.length > 10 ? 'Difficile' : 
                     quiz.questions?.length > 5 ? 'Moyen' : 'Facile';
    
    const estimatedTime = quiz.questions?.length ? `${quiz.questions.length * 2} min` : '10 min';

    return (
        <div className="quiz-card enhanced">
            <div className="quiz-header">
                <div className="quiz-badge">{difficulty}</div>
                <h3>{quiz.title || 'Quiz de compréhension'}</h3>
            </div>
            
            <div className="quiz-content">
                <p>{quiz.description || "Testez votre compréhension de ce chapitre."}</p>
                
                <div className="quiz-meta">
                    <div className="meta-item">
                        <FaQuestionCircle />
                        <span>{quiz.questions?.length || 5} questions</span>
                    </div>
                    <div className="meta-item">
                        <FaClock />
                        <span>{estimatedTime}</span>
                    </div>
                    <div className="meta-item">
                        <FaBullseye />
                        <span>Objectif: 80%</span>
                    </div>
                </div>
                
                {studyStats?.timeSpent > 300 && (
                    <div className="quiz-recommendation">
                        <FaLightbulb />
                        <span>Recommandé après {Math.round(studyStats.timeSpent / 60)} min d'étude</span>
                    </div>
                )}
            </div>
            
            <div className="quiz-actions">
                <button 
                    className="start-quiz-btn primary"
                    onClick={() => onStartQuiz(quiz._id)}
                >
                    <FaPlay />
                    Commencer le quiz
                </button>
                {quiz.attempts > 0 && (
                    <div className="quiz-history">
                        <span>Meilleur score: {quiz.bestScore || 0}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChapterView = () => {
    // États principaux
    const [chapter, setChapter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [readingProgress, setReadingProgress] = useState(0);
    const [studyTime, setStudyTime] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showTOC, setShowTOC] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [bookmarked, setBookmarked] = useState(false);
    const [liked, setLiked] = useState(false);
    
    // États pour les paramètres de lecture
    const [readingSettings, setReadingSettings] = useState({
        fontSize: 16,
        lineHeight: 1.6,
        theme: 'light',
        focusMode: false
    });
    
    // États pour les notes et highlights
    const [notes, setNotes] = useState([]);
    const [highlights, setHighlights] = useState([]);
    const [showNotes, setShowNotes] = useState(false);
    
    // Statistiques d'étude
    const [studyStats, setStudyStats] = useState({
        timeSpent: 0,
        progressPercentage: 0,
        lastPosition: 0,
        sessionStartTime: Date.now()
    });

    const { chapterId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef(null);
    const intersectionObserver = useRef(null);

    // Fonctions utilitaires
    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Sauvegarde automatique des paramètres de lecture
    useEffect(() => {
        const savedSettings = localStorage.getItem(`readingSettings-${chapterId}`);
        if (savedSettings) {
            setReadingSettings(JSON.parse(savedSettings));
        }
    }, [chapterId]);

    useEffect(() => {
        localStorage.setItem(`readingSettings-${chapterId}`, JSON.stringify(readingSettings));
    }, [readingSettings, chapterId]);

    // Chargement du chapitre avec gestion d'erreur améliorée
    const fetchChapter = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) {
                setError("Veuillez vous reconnecter");
                navigate("/login");
                return;
            }

            const response = await axios.get(`http://localhost:5000/api/chapters/${chapterId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setChapter(response.data);
            
            // Charger les données utilisateur pour ce chapitre
            await Promise.all([
                loadUserProgress(),
                loadUserNotes(),
                loadUserBookmarks()
            ]);

            setError(null);
        } catch (err) {
            console.error("Error fetching chapter:", err);
            setError(err.response?.data?.message || "Erreur lors du chargement du chapitre");
            
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                navigate("/login");
            }
        } finally {
            setLoading(false);
        }
    }, [chapterId, navigate]);

    // Chargement des données utilisateur
    const loadUserProgress = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:5000/api/chapters/${chapterId}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudyStats(prev => ({ ...prev, ...response.data }));
        } catch (err) {
            console.log("No previous progress found");
        }
    };

    const loadUserNotes = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:5000/api/chapters/${chapterId}/notes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotes(response.data || []);
        } catch (err) {
            console.log("No notes found");
        }
    };

    const loadUserBookmarks = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:5000/api/chapters/${chapterId}/bookmarks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookmarked(response.data?.bookmarked || false);
            setLiked(response.data?.liked || false);
        } catch (err) {
            console.log("No bookmarks found");
        }
    };

    useEffect(() => {
        fetchChapter();
    }, [fetchChapter]);

    // Suivi du progrès de lecture avec Intersection Observer
    useEffect(() => {
        if (!contentRef.current || loading) return;

        intersectionObserver.current = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(entry => entry.isIntersecting);
                if (visibleEntries.length > 0) {
                    const scrollProgress = Math.round(
                        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
                    );
                    setReadingProgress(Math.min(100, Math.max(0, scrollProgress)));
                }
            },
            { threshold: 0.5, rootMargin: '0px 0px -50% 0px' }
        );

        const paragraphs = contentRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        paragraphs.forEach(p => intersectionObserver.current.observe(p));

        return () => {
            if (intersectionObserver.current) {
                intersectionObserver.current.disconnect();
            }
        };
    }, [chapter, loading]);

    // Enregistrement automatique du progrès
    useEffect(() => {
        const saveProgress = async () => {
            if (studyTime < 30) return; // Sauvegarder seulement après 30 secondes
            
            try {
                const token = localStorage.getItem("token");
                await axios.post(
                    `http://localhost:5000/api/chapters/${chapterId}/progress`,
                    {
                        progressPercentage: readingProgress,
                        timeSpent: studyTime,
                        lastPosition: window.scrollY
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("Error saving progress:", err);
            }
        };

        const interval = setInterval(saveProgress, 60000); // Sauvegarder chaque minute
        return () => clearInterval(interval);
    }, [chapterId, readingProgress, studyTime]);

    // Session d'étude et analytics
    const recordStudySession = useCallback(async () => {
        if (!chapterId || loading || error) return;
        
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "http://localhost:5000/api/dashboard/student/study",
                { 
                    chapterId, 
                    timeSpent: studyTime,
                    progressPercentage: readingProgress 
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            showNotification("Progrès sauvegardé ✓", "success");
        } catch (err) {
            console.error("Error recording study session:", err);
        }
    }, [chapterId, loading, error, studyTime, readingProgress, showNotification]);

    // Gestionnaires d'événements
    const handleBackToDashboard = () => {
        recordStudySession();
        navigate('/dashboard/student');
    };

    const handleStartQuiz = (quizId) => {
        recordStudySession();
        navigate(`/quiz/${quizId}`, { 
            state: { 
                fromChapter: chapterId,
                studyTime: studyTime 
            } 
        });
    };

    const handleBookmark = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `http://localhost:5000/api/chapters/${chapterId}/bookmark`,
                { bookmarked: !bookmarked },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBookmarked(!bookmarked);
            showNotification(
                bookmarked ? "Marque-page retiré" : "Chapitre ajouté aux favoris",
                "success"
            );
        } catch (err) {
            showNotification("Erreur lors de la sauvegarde", "error");
        }
    };

    const handleLike = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `http://localhost:5000/api/chapters/${chapterId}/like`,
                { liked: !liked },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLiked(!liked);
            showNotification(
                liked ? "Like retiré" : "Chapitre liké ❤️",
                "success"
            );
        } catch (err) {
            showNotification("Erreur lors de l'action", "error");
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: chapter?.name,
                    text: `Découvrez ce chapitre : ${chapter?.name}`,
                    url: window.location.href
                });
            } catch (err) {
                console.log("Share cancelled");
            }
        } else {
            await navigator.clipboard.writeText(window.location.href);
            showNotification("Lien copié dans le presse-papiers", "success");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        if (!isFullscreen) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const updateReadingSettings = (newSettings) => {
        setReadingSettings(prev => ({ ...prev, ...newSettings }));
    };

    const scrollToSection = (sectionIndex) => {
        const headings = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings && headings[sectionIndex]) {
            headings[sectionIndex].scrollIntoView({ behavior: 'smooth' });
            setActiveSection(sectionIndex);
        }
    };

    // Raccourcis clavier
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                handleBackToDashboard();
            } else if (e.key === 'Escape') {
                setIsFullscreen(false);
                setShowTOC(false);
                setShowNotes(false);
            } else if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        handleBookmark();
                        break;
                    case 'p':
                        e.preventDefault();
                        handlePrint();
                        break;
                    case 'f':
                        e.preventDefault();
                        toggleFullscreen();
                        break;
                    case 's':
                        e.preventDefault();
                        handleShare();
                        break;
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [bookmarked]);

    // Nettoyage à la fermeture
    useEffect(() => {
        return () => {
            recordStudySession();
        };
    }, [recordStudySession]);

    if (loading) {
        return <LoadingSpinner size="large" />;
    }

    if (error) {
        return (
            <div className="chapter-error">
                <div className="error-content">
                    <h2>Erreur de chargement</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={fetchChapter} className="retry-btn">
                            Réessayer
                        </button>
                        <button onClick={handleBackToDashboard} className="back-btn">
                            Retour au tableau de bord
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`chapter-view-container ${readingSettings.theme} ${isFullscreen ? 'fullscreen' : ''} ${readingSettings.focusMode ? 'focus-mode' : ''}`}>
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

            {/* Barre de progrès de lecture */}
            <ReadingProgress progress={readingProgress} />

            {/* Navigation et contrôles */}
            <div className="chapter-header">
                <div className="chapter-nav">
                    <button className="back-button" onClick={handleBackToDashboard}>
                        <FaArrowLeft />
                        <span>Retour</span>
                    </button>
                    
                    <div className="chapter-info">
                        <h1 className="chapter-title-nav">{chapter?.name}</h1>
                        <StudyTimer onTimeUpdate={setStudyTime} />
                    </div>
                </div>

                <div className="chapter-controls">
                    <button 
                        className={`control-btn ${bookmarked ? 'active' : ''}`}
                        onClick={handleBookmark}
                        title="Marquer comme favori (Ctrl+B)"
                    >
                        <FaBookmark />
                    </button>
                    
                    <button 
                        className={`control-btn ${liked ? 'active' : ''}`}
                        onClick={handleLike}
                        title="J'aime ce chapitre"
                    >
                        <FaHeart />
                    </button>
                    
                    <button 
                        className="control-btn"
                        onClick={handleShare}
                        title="Partager (Ctrl+S)"
                    >
                        <FaShare />
                    </button>
                    
                    <button 
                        className="control-btn"
                        onClick={handlePrint}
                        title="Imprimer (Ctrl+P)"
                    >
                        <FaPrint />
                    </button>
                    
                    <button 
                        className={`control-btn ${showTOC ? 'active' : ''}`}
                        onClick={() => setShowTOC(!showTOC)}
                        title="Table des matières"
                    >
                        <FaBookOpen />
                    </button>
                    
                    <ReadingSettings 
                        settings={readingSettings}
                        onSettingsChange={updateReadingSettings}
                    />
                    
                    <button 
                        className="control-btn"
                        onClick={toggleFullscreen}
                        title="Plein écran (Ctrl+F)"
                    >
                        {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                </div>
            </div>

            <div className="chapter-layout">
                {/* Table des matières */}
                {showTOC && (
                    <aside className="chapter-sidebar">
                        <TableOfContents
                            content={chapter?.content}
                            onSectionClick={scrollToSection}
                            activeSection={activeSection}
                        />
                    </aside>
                )}

                {/* Contenu principal */}
                <main className="chapter-main">
                    <article 
                        className="chapter-content"
                        ref={contentRef}
                        style={{
                            fontSize: `${readingSettings.fontSize}px`,
                            lineHeight: readingSettings.lineHeight
                        }}
                    >
                        <header className="chapter-intro">
                            <h1 className="chapter-title">{chapter?.name}</h1>
                            
                            <div className="chapter-meta">
                                <div className="meta-item">
                                    <FaClock />
                                    <span>Temps de lecture: ~{Math.ceil((chapter?.content?.length || 1000) / 200)} min</span>
                                </div>
                                <div className="meta-item">
                                    <FaGraduationCap />
                                    <span>Niveau: {chapter?.difficulty || 'Intermédiaire'}</span>
                                </div>
                                {chapter?.objectives && (
                                    <div className="meta-item">
                                        <FaBullseye />
                                        <span>{chapter.objectives.length} objectifs d'apprentissage</span>
                                    </div>
                                )}
                            </div>

                            {chapter?.objectives && (
                                <div className="learning-objectives">
                                    <h3><FaRocket /> Objectifs d'apprentissage</h3>
                                    <ul>
                                        {chapter.objectives.map((objective, index) => (
                                            <li key={index}>{objective}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </header>

                        <div 
                            className="chapter-text"
                            dangerouslySetInnerHTML={{ __html: chapter?.content }}
                        />

                        {chapter?.images && chapter.images.length > 0 && (
                            <section className="chapter-images">
                                <h3>Illustrations</h3>
                                <div className="images-grid">
                                    {chapter.images.map((img, index) => (
                                        <figure key={index} className="chapter-figure">
                                            <img 
                                                src={img.url || img} 
                                                alt={img.caption || `Figure ${index + 1}`}
                                                className="chapter-image"
                                                loading="lazy"
                                            />
                                            {img.caption && (
                                                <figcaption>{img.caption}</figcaption>
                                            )}
                                        </figure>
                                    ))}
                                </div>
                            </section>
                        )}

                        {chapter?.summary && (
                            <section className="chapter-summary">
                                <h3><FaLightbulb /> Résumé du chapitre</h3>
                                <div className="summary-content">
                                    {chapter.summary}
                                </div>
                            </section>
                        )}
                    </article>

                    {/* Section Quiz */}
                    {chapter?.quizzes && chapter.quizzes.length > 0 && (
                        <section className="chapter-assessment">
                            <div className="section-header">
                                <h2><FaQuestionCircle /> Évaluation de vos connaissances</h2>
                                <p>Testez votre compréhension avec ces quiz interactifs</p>
                            </div>
                            
                            <div className="quiz-grid">
                                {chapter.quizzes.map((quiz, index) => (
                                    <QuizCard
                                        key={quiz._id || index}
                                        quiz={quiz}
                                        onStartQuiz={handleStartQuiz}
                                        studyStats={studyStats}
                                    />
                                ))}
                            </div>

                            <div className="study-recommendations">
                                <h3><FaBrain /> Recommandations d'étude</h3>
                                <div className="recommendations-grid">
                                    <div className="recommendation-card">
                                        <FaClock />
                                        <h4>Temps d'étude optimal</h4>
                                        <p>Continuez encore {Math.max(0, 10 - Math.floor(studyTime / 60))} minutes pour une compréhension optimale</p>
                                    </div>
                                    <div className="recommendation-card">
                                        <FaChartLine />
                                        <h4>Votre progression</h4>
                                        <p>Vous avez lu {readingProgress}% du chapitre</p>
                                    </div>
                                    <div className="recommendation-card">
                                        <FaAward />
                                        <h4>Objectif de réussite</h4>
                                        <p>Visez 80% ou plus aux quiz pour valider vos acquis</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Navigation entre chapitres */}
                    <nav className="chapter-navigation">
                        <button className="nav-btn prev" disabled>
                            <FaArrowLeft />
                            <span>Chapitre précédent</span>
                        </button>
                        <button className="nav-btn next" disabled>
                            <span>Chapitre suivant</span>
                            <FaArrowLeft style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </nav>
                </main>

                {/* Panel de statistiques flottant */}
                <div className="study-stats-panel">
                    <div className="stats-header">
                        <FaChartLine />
                        <span>Votre session</span>
                    </div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Temps</span>
                            <span className="stat-value">{Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Progression</span>
                            <span className="stat-value">{readingProgress}%</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Statut</span>
                            <span className="stat-value">
                                {readingProgress > 80 ? '🎉 Excellent' : 
                                 readingProgress > 50 ? '👍 Bien' : 
                                 '📖 En cours'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer avec raccourcis */}
            <footer className="chapter-footer">
                <div className="keyboard-shortcuts">
                    <h4>Raccourcis clavier</h4>
                    <div className="shortcuts-grid">
                        <div className="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>←</kbd>
                            <span>Retour</span>
                        </div>
                        <div className="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>B</kbd>
                            <span>Marque-page</span>
                        </div>
                        <div className="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>F</kbd>
                            <span>Plein écran</span>
                        </div>
                        <div className="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>P</kbd>
                            <span>Imprimer</span>
                        </div>
                        <div className="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Fermer</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ChapterView;