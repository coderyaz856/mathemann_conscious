import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/QuizView.css';
import { 
    FaClock, FaCheck, FaTimes, FaLightbulb, FaBrain, FaRandom, 
    FaExchangeAlt, FaPuzzlePiece, FaArrowLeft, FaArrowRight,
    FaPlay, FaPause, FaRedo, FaBookmark, FaEye, FaEyeSlash,
    FaChartLine, FaAward, FaQuestionCircle
} from 'react-icons/fa';
import QuizService from '../services/QuizService';
import TechniqueBanner from './QuizComponents/TechniqueBanner';

// Composant pour les notifications toast
const Toast = ({ message, type, onClose }) => (
    <div className={`toast toast-${type}`}>
        <span>{message}</span>
        <button onClick={onClose}>×</button>
    </div>
);

// Composant pour la vue d'ensemble des questions
const QuizOverview = ({ questions, answers, currentIndex, onNavigate, onClose }) => (
    <div className="quiz-overview-modal">
        <div className="quiz-overview-content">
            <div className="overview-header">
                <h3>Vue d'ensemble du quiz</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </div>
            <div className="overview-grid">
                {questions.map((_, index) => (
                    <button
                        key={index}
                        className={`overview-item ${
                            index === currentIndex ? 'current' : ''
                        } ${answers[index] ? 'answered' : 'unanswered'}`}
                        onClick={() => {
                            onNavigate(index);
                            onClose();
                        }}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>
            <div className="overview-stats">
                <span>{answers.filter(a => a).length} répondues</span>
                <span>{questions.length - answers.filter(a => a).length} restantes</span>
            </div>
        </div>
    </div>
);

const QuizView = () => {
    // États principaux
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [allAnswers, setAllAnswers] = useState([]);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [quizResults, setQuizResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [chapterContent, setChapterContent] = useState(null);
    
    // États pour les nouvelles fonctionnalités
    const [isPaused, setIsPaused] = useState(false);
    const [showOverview, setShowOverview] = useState(false);
    const [showHints, setShowHints] = useState(true);
    const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
    const [confidenceLevel, setConfidenceLevel] = useState({});
    const [startTime, setStartTime] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [answerHistory, setAnswerHistory] = useState([]);
    
    const { quizId } = useParams();
    const navigate = useNavigate();

    // Fonctions utilitaires
    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Sauvegarde automatique des progrès
    const saveProgress = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const progressData = {
                currentQuestionIndex,
                allAnswers,
                timeLeft,
                confidenceLevel,
                bookmarkedQuestions: Array.from(bookmarkedQuestions)
            };
            
            await axios.post(
                `http://localhost:5000/api/quizzes/${quizId}/save-progress`,
                progressData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            console.error("Erreur lors de la sauvegarde:", err);
        }
    }, [quizId, currentQuestionIndex, allAnswers, timeLeft, confidenceLevel, bookmarkedQuestions]);

    // Chargement des progrès sauvegardés
    const loadProgress = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `http://localhost:5000/api/quizzes/${quizId}/progress`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data) {
                const progress = response.data;
                setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
                setAllAnswers(progress.allAnswers || []);
                setTimeLeft(progress.timeLeft);
                setConfidenceLevel(progress.confidenceLevel || {});
                setBookmarkedQuestions(new Set(progress.bookmarkedQuestions || []));
                setSelectedAnswer(progress.allAnswers?.[progress.currentQuestionIndex] || '');
            }
        } catch (err) {
            console.error("Erreur lors du chargement des progrès:", err);
        }
    }, [quizId]);

    // Métriques et analyses
    const quizMetrics = useMemo(() => {
        if (!quiz || !allAnswers.length) return null;
        
        const answeredCount = allAnswers.filter(a => a).length;
        const progress = (answeredCount / quiz.questions.length) * 100;
        const avgConfidence = Object.values(confidenceLevel).reduce((sum, conf) => sum + conf, 0) / 
                             Object.keys(confidenceLevel).length || 0;
        
        return {
            progress,
            answeredCount,
            totalQuestions: quiz.questions.length,
            avgConfidence,
            bookmarkedCount: bookmarkedQuestions.size,
            timeSpent: startTime ? (Date.now() - startTime) / 1000 : 0
        };
    }, [quiz, allAnswers, confidenceLevel, bookmarkedQuestions, startTime]);

    // Initialisation
    useEffect(() => {
        if (quiz) {
            setAllAnswers(new Array(quiz.questions.length).fill(''));
            setStartTime(Date.now());
            loadProgress();
        }
    }, [quiz, loadProgress]);

    // Sauvegarde automatique
    useEffect(() => {
        if (quiz && !quizCompleted) {
            const saveInterval = setInterval(saveProgress, 30000); // Sauvegarde toutes les 30 secondes
            return () => clearInterval(saveInterval);
        }
    }, [quiz, quizCompleted, saveProgress]);

    // Chargement du quiz
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("Veuillez vous reconnecter");
                    navigate("/login");
                    return;
                }

                const response = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setQuiz(response.data);
                
                if (response.data.timeLimit) {
                    setTimeLeft(response.data.timeLimit * 60);
                }
                
                setLoading(false);
                addToast("Quiz chargé avec succès", "success");
            } catch (err) {
                console.error("Erreur lors du chargement:", err);
                setError(err.response?.data?.message || "Échec du chargement du quiz");
                setLoading(false);
                
                if (err.response?.status === 403 || err.response?.status === 401) {
                    localStorage.clear();
                    navigate("/login");
                }
            }
        };

        fetchQuiz();
    }, [quizId, navigate, addToast]);

    // Gestionnaire de soumission amélioré
    const handleSubmitQuiz = useCallback(async () => {
        try {
            setLoading(true);
            
            const finalAnswers = [...allAnswers];
            finalAnswers[currentQuestionIndex] = selectedAnswer;
            
            const hasUnanswered = finalAnswers.some(answer => !answer);
            if (hasUnanswered) {
                const unansweredIndex = finalAnswers.findIndex(answer => !answer);
                setCurrentQuestionIndex(unansweredIndex);
                addToast("Veuillez répondre à toutes les questions", "warning");
                setLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            const submissionData = {
                answers: finalAnswers,
                confidenceLevel,
                timeSpent: quizMetrics?.timeSpent || 0,
                bookmarkedQuestions: Array.from(bookmarkedQuestions)
            };

            const response = await axios.post(
                `http://localhost:5000/api/quizzes/${quizId}/attempt`,
                submissionData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setQuizResults(response.data);
            setQuizCompleted(true);
            addToast("Quiz soumis avec succès!", "success");

            if (quiz?.type === 'spaced-repetition') {
                QuizService.trackSpacedRepetition(quizId, response.data.score);
            }

        } catch (err) {
            console.error("Erreur lors de la soumission:", err);
            addToast("Échec de la soumission. Réessayez.", "error");
        } finally {
            setLoading(false);
        }
    }, [allAnswers, currentQuestionIndex, selectedAnswer, quizId, quiz, 
        confidenceLevel, quizMetrics, bookmarkedQuestions, addToast]);

    // Timer amélioré
    useEffect(() => {
        if (timeLeft === null || quizCompleted || isPaused) return;
        
        if (timeLeft <= 0) {
            addToast("Temps écoulé! Soumission automatique du quiz.", "warning");
            handleSubmitQuiz();
            return;
        }
        
        const timerId = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);
        
        return () => clearTimeout(timerId);
    }, [timeLeft, quizCompleted, isPaused, handleSubmitQuiz, addToast]);

    // Gestion des réponses améliorée
    const handleAnswerSelect = useCallback((answer) => {
        // Enregistrer l'historique des réponses
        setAnswerHistory(prev => [...prev, {
            questionIndex: currentQuestionIndex,
            previousAnswer: selectedAnswer,
            newAnswer: answer,
            timestamp: Date.now()
        }]);

        setSelectedAnswer(answer);
        
        const updatedAnswers = [...allAnswers];
        updatedAnswers[currentQuestionIndex] = answer;
        setAllAnswers(updatedAnswers);
        
        addToast("Réponse enregistrée", "success", 1000);
    }, [currentQuestionIndex, selectedAnswer, allAnswers, addToast]);

    // Navigation améliorée
    const navigateToQuestion = useCallback((index) => {
        if (index >= 0 && index < quiz.questions.length) {
            const updatedAnswers = [...allAnswers];
            updatedAnswers[currentQuestionIndex] = selectedAnswer;
            setAllAnswers(updatedAnswers);
            
            setCurrentQuestionIndex(index);
            setSelectedAnswer(updatedAnswers[index] || '');
        }
    }, [quiz, allAnswers, currentQuestionIndex, selectedAnswer]);

    const handleNextQuestion = useCallback(() => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            navigateToQuestion(currentQuestionIndex + 1);
        }
    }, [currentQuestionIndex, quiz, navigateToQuestion]);

    const handlePreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            navigateToQuestion(currentQuestionIndex - 1);
        }
    }, [currentQuestionIndex, navigateToQuestion]);

    // Gestion des signets
    const toggleBookmark = useCallback(() => {
        setBookmarkedQuestions(prev => {
            const newBookmarks = new Set(prev);
            if (newBookmarks.has(currentQuestionIndex)) {
                newBookmarks.delete(currentQuestionIndex);
                addToast("Signet retiré", "info");
            } else {
                newBookmarks.add(currentQuestionIndex);
                addToast("Question mise en signet", "success");
            }
            return newBookmarks;
        });
    }, [currentQuestionIndex, addToast]);

    // Gestion du niveau de confiance
    const setQuestionConfidence = useCallback((level) => {
        setConfidenceLevel(prev => ({
            ...prev,
            [currentQuestionIndex]: level
        }));
    }, [currentQuestionIndex]);

    // Raccourcis clavier
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (quizCompleted) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    handlePreviousQuestion();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleNextQuestion();
                    break;
                case ' ':
                    e.preventDefault();
                    setIsPaused(prev => !prev);
                    break;
                case 'b':
                    e.preventDefault();
                    toggleBookmark();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    e.preventDefault();
                    const optionIndex = parseInt(e.key) - 1;
                    const currentQuestion = quiz?.questions[currentQuestionIndex];
                    if (currentQuestion?.options[optionIndex]) {
                        handleAnswerSelect(currentQuestion.options[optionIndex]);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [quizCompleted, handlePreviousQuestion, handleNextQuestion, toggleBookmark, 
        quiz, currentQuestionIndex, handleAnswerSelect]);

    // Fonctions utilitaires pour le rendu
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getQuizTypeIcon = () => {
        switch(quiz?.type) {
            case 'recall': return <FaBrain />;
            case 'spaced-repetition': return <FaClock />;
            case 'interleaved': return <FaRandom />;
            case 'encoding': return <FaLightbulb />;
            case 'chunking': return <FaPuzzlePiece />;
            case 'contextual-variation': return <FaExchangeAlt />;
            default: return <FaCheck />;
        }
    };

    const renderQuizTypeInstructions = () => {
        const instructions = {
            'recall': "Testez vos connaissances en répondant aux questions de mémoire.",
            'spaced-repetition': "Ce quiz renforce les connaissances par exposition répétée. Vous reverrez ces concepts.",
            'interleaved': "Ce quiz mélange différents concepts pour renforcer votre capacité de sélection.",
            'encoding': "Concentrez-vous sur la création de connexions mentales pour une mémorisation long terme.",
            'chunking': "Remarquez comment les sujets complexes sont décomposés en parties gérables.",
            'contextual-variation': "Observez comment les mêmes concepts apparaissent dans différents contextes."
        };
        return instructions[quiz?.type] || "Répondez du mieux que vous pouvez à chaque question.";
    };

    // États de chargement et d'erreur
    if (loading) {
        return (
            <div className="quiz-loading">
                <div className="spinner"></div>
                <p>Chargement du quiz...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="quiz-error">
                <h2>Erreur</h2>
                <p>{error}</p>
                <button onClick={() => {
                    setError(null);
                    if (quiz) return;
                    navigate(-1);
                }}>
                    {quiz ? "Continuer" : "Retour"}
                </button>
            </div>
        );
    }

    if (quizCompleted) {
        return (
            <div className="quiz-results-container">
                <h2>Résultats du Quiz</h2>
                
                <div className="score-card">
                    <div className="score-percentage">{Math.round(quizResults.score)}%</div>
                    <p className="score-details">
                        Vous avez répondu correctement à {quizResults.correct} questions sur {quizResults.total}
                    </p>
                    <div className="quiz-stats">
                        <div className="stat">
                            <FaClock />
                            <span>Temps: {Math.round(quizMetrics?.timeSpent || 0)}s</span>
                        </div>
                        <div className="stat">
                            <FaChartLine />
                            <span>Confiance: {Math.round(quizMetrics?.avgConfidence || 0)}%</span>
                        </div>
                        <div className="stat">
                            <FaBookmark />
                            <span>Signets: {quizMetrics?.bookmarkedCount || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Feedback technique spécifique */}
                <div className={`technique-feedback ${quiz.type}`}>
                    <h3>{getQuizTypeIcon()} {quiz.type.replace('-', ' ')}</h3>
                    <p>Technique d'apprentissage appliquée avec succès!</p>
                </div>

                {/* Révision des questions */}
                <div className="questions-review">
                    <h3>Révision de vos réponses</h3>
                    {quizResults.results.map((result, index) => (
                        <div 
                            key={index} 
                            className={`question-result ${result.isCorrect ? 'correct' : 'incorrect'}`}
                        >
                            <div className="question-header">
                                {result.isCorrect ? 
                                    <FaCheck className="correct-icon" /> : 
                                    <FaTimes className="incorrect-icon" />
                                }
                                <h4>Question {index + 1}</h4>
                                {bookmarkedQuestions.has(index) && <FaBookmark className="bookmark-icon" />}
                            </div>
                            <p className="question-text">{quiz.questions[index].question}</p>
                            <div className="answer-review">
                                <p>Votre réponse: <strong>{result.userAnswer}</strong></p>
                                {!result.isCorrect && (
                                    <p>Réponse correcte: <strong>{result.correctAnswer}</strong></p>
                                )}
                                {confidenceLevel[index] && (
                                    <p>Niveau de confiance: {confidenceLevel[index]}%</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="next-steps">
                    <button className="continue-btn" onClick={() => navigate(`/chapter/${quiz.chapter}`)}>
                        Retour au chapitre
                    </button>
                    <button className="continue-btn secondary" onClick={() => navigate('/dashboard')}>
                        Tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
        <div className="quiz-container">
            {/* Notifications Toast */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Modal de vue d'ensemble */}
            {showOverview && (
                <QuizOverview
                    questions={quiz.questions}
                    answers={allAnswers}
                    currentIndex={currentQuestionIndex}
                    onNavigate={navigateToQuestion}
                    onClose={() => setShowOverview(false)}
                />
            )}

            {/* Banner de technique */}
            <TechniqueBanner type={quiz.type} />
            
            {/* Header du quiz */}
            <div className="quiz-header">
                <div className="quiz-title-row">
                    <h2>{quiz.title}</h2>
                    <div className="quiz-actions">
                        <button 
                            className="action-btn"
                            onClick={() => setShowOverview(true)}
                            title="Vue d'ensemble"
                        >
                            <FaQuestionCircle />
                        </button>
                        <button 
                            className="action-btn"
                            onClick={() => setShowHints(!showHints)}
                            title={showHints ? "Masquer les indices" : "Afficher les indices"}
                        >
                            {showHints ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button 
                            className="action-btn"
                            onClick={() => setIsPaused(!isPaused)}
                            title={isPaused ? "Reprendre" : "Pause"}
                        >
                            {isPaused ? <FaPlay /> : <FaPause />}
                        </button>
                    </div>
                </div>
                
                <p className="quiz-description">{quiz.description}</p>
                
                <div className="quiz-metadata">
                    <span className="quiz-type">
                        {getQuizTypeIcon()} {quiz.type.replace('-', ' ')}
                    </span>
                    {timeLeft !== null && (
                        <div className={`quiz-timer ${isPaused ? 'paused' : ''}`}>
                            <FaClock className="timer-icon" />
                            <span className="time-remaining">{formatTime(timeLeft)}</span>
                        </div>
                    )}
                    {quizMetrics && (
                        <div className="quiz-metrics">
                            <span>{Math.round(quizMetrics.progress)}% complété</span>
                        </div>
                    )}
                </div>
                
                <p className="quiz-instructions">
                    {renderQuizTypeInstructions()}
                </p>
            </div>
            
            {/* Barre de progression */}
            <div className="quiz-progress">
                <div 
                    className="progress-bar" 
                    style={{ width: `${progress}%` }}
                ></div>
                <span className="progress-text">
                    Question {currentQuestionIndex + 1} sur {quiz.questions.length}
                </span>
            </div>
            
            {/* Container de question */}
            <div className="question-container">
                <div className="question-header">
                    <h3 className="question-text">{currentQuestion.question}</h3>
                    <button 
                        className={`bookmark-btn ${bookmarkedQuestions.has(currentQuestionIndex) ? 'active' : ''}`}
                        onClick={toggleBookmark}
                        title="Marquer cette question"
                    >
                        <FaBookmark />
                    </button>
                </div>
                
                {currentQuestion.imageUrl && (
                    <img 
                        src={currentQuestion.imageUrl} 
                        alt="Visuel de la question" 
                        className="question-image" 
                    />
                )}
                
                <div className="answer-options">
                    {currentQuestion.options.map((option, index) => (
                        <div 
                            key={index}
                            className={`answer-option ${selectedAnswer === option ? 'selected' : ''}`}
                            onClick={() => handleAnswerSelect(option)}
                        >
                            <div className="option-letter">
                                {String.fromCharCode(65 + index)}
                            </div>
                            <div className="option-text">{option}</div>
                        </div>
                    ))}
                </div>

                {/* Niveau de confiance */}
                <div className="confidence-selector">
                    <label>Niveau de confiance:</label>
                    <div className="confidence-buttons">
                        {[25, 50, 75, 100].map(level => (
                            <button
                                key={level}
                                className={`confidence-btn ${
                                    confidenceLevel[currentQuestionIndex] === level ? 'active' : ''
                                }`}
                                onClick={() => setQuestionConfidence(level)}
                            >
                                {level}%
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Navigation du quiz */}
            <div className="quiz-navigation">
                <button 
                    onClick={handlePreviousQuestion}
                    className="prev-button"
                    disabled={currentQuestionIndex === 0}
                >
                    <FaArrowLeft /> Précédent
                </button>
                
                <div className="nav-center">
                    <span className="keyboard-hint">
                        Utilisez ← → pour naviguer, Espace pour pause, B pour signet
                    </span>
                </div>
                
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <button 
                        onClick={handleNextQuestion}
                        className="next-button"
                        disabled={!selectedAnswer}
                    >
                        Suivant <FaArrowRight />
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmitQuiz}
                        className="next-button submit-button"
                        disabled={!selectedAnswer || loading}
                    >
                        {loading ? 'Soumission...' : 'Soumettre le Quiz'}
                    </button>
                )}
            </div>
            
            {/* Statut de completion */}
            <div className="quiz-completion-status">
                <div className="completion-details">
                    <span>{allAnswers.filter(a => a).length} sur {quiz.questions.length} questions répondues</span>
                    <span>{bookmarkedQuestions.size} question(s) en signet</span>
                </div>
            </div>
        </div>
    );
};

export default QuizView;