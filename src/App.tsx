import { useState, useEffect, useCallback } from 'react';
import type { IkeaProduct } from './types/ikea';
import {
  fetchDailyProducts,
  formatPrice,
  calculateAccuracy,
  getAccuracyMessage,
  detectUserCountry,
  getCountryConfig,
  getTodayKey,
  generateShareText,
  ROUNDS_PER_DAY,
} from './services/ikea';
import './App.css';

type GameState = 'loading' | 'guessing' | 'revealed' | 'finished' | 'error';

interface DailyProgress {
  date: string;
  currentRound: number;
  scores: number[];
  completed: boolean;
}

function App() {
  const [products, setProducts] = useState<IkeaProduct[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [guess, setGuess] = useState<number>(100);
  const [scores, setScores] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('us');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const config = getCountryConfig(countryCode);
  const product = products[currentRound] || null;
  const totalScore = scores.reduce((a, b) => a + Math.round(b), 0);

  // Load saved progress from localStorage
  const loadProgress = useCallback((): DailyProgress | null => {
    try {
      const saved = localStorage.getItem('ikea-guesser-progress');
      if (saved) {
        const progress: DailyProgress = JSON.parse(saved);
        if (progress.date === getTodayKey()) {
          return progress;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((round: number, newScores: number[], completed: boolean) => {
    const progress: DailyProgress = {
      date: getTodayKey(),
      currentRound: round,
      scores: newScores,
      completed,
    };
    localStorage.setItem('ikea-guesser-progress', JSON.stringify(progress));
  }, []);

  // Initialize game
  const initGame = useCallback(async () => {
    setGameState('loading');
    setErrorMessage('');

    // Detect country
    const detectedCountry = detectUserCountry();
    setCountryCode(detectedCountry);

    // Check for saved progress
    const savedProgress = loadProgress();

    try {
      const dailyProducts = await fetchDailyProducts(detectedCountry);
      setProducts(dailyProducts);

      if (savedProgress && savedProgress.completed) {
        // Already finished today
        setScores(savedProgress.scores);
        setCurrentRound(ROUNDS_PER_DAY);
        setGameState('finished');
      } else if (savedProgress) {
        // Resume from saved progress
        setScores(savedProgress.scores);
        setCurrentRound(savedProgress.currentRound);
        const nextProduct = dailyProducts[savedProgress.currentRound];
        if (nextProduct) {
          const maxGuess = Math.min(nextProduct.price.currentPrice * 3, 1000);
          setGuess(Math.round(maxGuess / 2));
        }
        setGameState('guessing');
      } else {
        // Fresh start
        const firstProduct = dailyProducts[0];
        const maxGuess = Math.min(firstProduct.price.currentPrice * 3, 1000);
        setGuess(Math.round(maxGuess / 2));
        setGameState('guessing');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setErrorMessage('Failed to load today\'s products. Please try again!');
      setGameState('error');
    }
  }, [loadProgress]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleSubmitGuess = () => {
    if (!product) return;

    const accuracyValue = calculateAccuracy(guess, product.price.currentPrice);
    setAccuracy(accuracyValue);

    const newScores = [...scores, accuracyValue];
    setScores(newScores);

    // Show confetti for great guesses
    if (accuracyValue >= 85) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }

    // Check if this was the last round
    const isLastRound = currentRound >= ROUNDS_PER_DAY - 1;
    saveProgress(currentRound + 1, newScores, isLastRound);

    setGameState('revealed');
  };

  const handleNextRound = () => {
    const nextRound = currentRound + 1;

    if (nextRound >= ROUNDS_PER_DAY) {
      setGameState('finished');
    } else {
      setCurrentRound(nextRound);
      const nextProduct = products[nextRound];
      if (nextProduct) {
        const maxGuess = Math.min(nextProduct.price.currentPrice * 3, 1000);
        setGuess(Math.round(maxGuess / 2));
      }
      setGameState('guessing');
    }
  };

  const handleShare = async () => {
    const shareText = generateShareText(scores, totalScore);

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Can't share or copy
      }
    }
  };

  const getSliderMax = () => {
    if (!product) return 500;
    return Math.min(Math.round(product.price.currentPrice * 3), 2000);
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`text-lg ${
              i < fullStars
                ? 'text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'text-yellow-400 opacity-50'
                : 'text-gray-400'
            }`}
          >
            ★
          </span>
        ))}
        <span className="text-sm text-gray-300 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const renderProgressDots = () => (
    <div className="flex gap-2 justify-center mb-4">
      {[...Array(ROUNDS_PER_DAY)].map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all ${
            i < scores.length
              ? scores[i] >= 70
                ? 'bg-green-400'
                : scores[i] >= 40
                ? 'bg-yellow-400'
                : 'bg-red-400'
              : i === currentRound && gameState !== 'finished'
              ? 'bg-white ring-2 ring-[#ffdb00]'
              : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: '100%',
                backgroundColor: ['#ffdb00', '#0058a3', '#ffffff', '#ff6b00'][Math.floor(Math.random() * 4)],
                animation: `confetti ${1 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && product && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img
              src={product.contextualImageUrl || product.mainImageUrl}
              alt={product.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-800 font-bold hover:bg-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          <span className="text-[#ffdb00]">IKEA</span> Price Guesser
        </h1>
        <p className="text-blue-200 text-lg">How well do you know Swedish prices?</p>
        <p className="text-blue-300 text-sm mt-1">
          {config.country.toUpperCase()} • {config.currency}
        </p>
      </header>

      {/* Progress dots */}
      {renderProgressDots()}

      {/* Main game card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {gameState === 'loading' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-[#0058a3] border-t-[#ffdb00] rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading today's products...</p>
          </div>
        )}

        {gameState === 'error' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">😕</div>
            <p className="text-gray-600 mb-4 text-center">{errorMessage}</p>
            <button
              onClick={initGame}
              className="bg-[#0058a3] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#004280] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Complete!</h2>
            <div className="text-4xl font-bold text-[#0058a3] mb-4">
              {totalScore}/{ROUNDS_PER_DAY * 100}
            </div>

            {/* Score breakdown */}
            <div className="flex gap-2 mb-6">
              {scores.map((score, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                    score >= 70 ? 'bg-green-100' : score >= 40 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}
                >
                  {getAccuracyMessage(score).emoji}
                </div>
              ))}
            </div>

            <button
              onClick={handleShare}
              className="w-full bg-[#ffdb00] text-gray-900 py-4 rounded-full font-bold text-lg hover:bg-[#e5c500] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {copied ? '✓ Copied!' : 'Share Results'}
            </button>

            <p className="text-gray-500 text-sm mt-4">Come back tomorrow for new products!</p>
          </div>
        )}

        {(gameState === 'guessing' || gameState === 'revealed') && product && (
          <>
            {/* Product image */}
            <div className="relative bg-gray-100 aspect-square">
              <img
                src={product.mainImageUrl}
                alt={product.mainImageAlt || product.name}
                className={`w-full h-full object-contain p-4 ${gameState === 'guessing' ? 'animate-float' : ''}`}
              />
              {product.contextualImageUrl && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="absolute bottom-2 right-2 w-16 h-16 rounded-lg border-2 border-white shadow-lg overflow-hidden hover:scale-110 transition-transform cursor-pointer"
                >
                  <img
                    src={product.contextualImageUrl}
                    alt="View larger"
                    className="w-full h-full object-cover"
                  />
                </button>
              )}
              <div className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                Round {currentRound + 1}/{ROUNDS_PER_DAY}
              </div>
            </div>

            {/* Product info */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h2>
              <p className="text-gray-500 mb-2">{product.typeName}</p>
              {renderStars(product.ratingValue)}

              {gameState === 'guessing' && (
                <>
                  {/* Price slider */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Your guess:</span>
                      <span className="text-2xl font-bold text-[#0058a3]">
                        {formatPrice(guess, config.currency, config.locale)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={getSliderMax()}
                      value={guess}
                      onChange={(e) => setGuess(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #0058a3 0%, #0058a3 ${(guess / getSliderMax()) * 100}%, #e5e7eb ${(guess / getSliderMax()) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{formatPrice(1, config.currency, config.locale)}</span>
                      <span>{formatPrice(getSliderMax(), config.currency, config.locale)}</span>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleSubmitGuess}
                    className="w-full mt-6 bg-[#ffdb00] text-gray-900 py-4 rounded-full font-bold text-lg hover:bg-[#e5c500] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Lock in my guess!
                  </button>
                </>
              )}

              {gameState === 'revealed' && (
                <>
                  {/* Result display */}
                  <div className={`mt-6 p-4 rounded-xl ${accuracy >= 70 ? 'bg-green-50' : accuracy >= 40 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">{getAccuracyMessage(accuracy).emoji}</div>
                      <div className={`text-xl font-bold ${accuracy >= 70 ? 'text-green-600' : accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {getAccuracyMessage(accuracy).message}
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="text-gray-600">
                          Your guess: <span className="font-semibold">{formatPrice(guess, config.currency, config.locale)}</span>
                        </div>
                        <div className="text-gray-900">
                          Actual price: <span className="font-bold text-[#0058a3] text-xl">{formatPrice(product.price.currentPrice, config.currency, config.locale)}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          Accuracy: {accuracy.toFixed(1)}% (+{Math.round(accuracy)} points)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View on IKEA link */}
                  <a
                    href={`https://www.ikea.com${product.pipUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-4 text-center text-[#0058a3] hover:underline text-sm"
                  >
                    View on IKEA.com →
                  </a>

                  {/* Next button */}
                  <button
                    onClick={handleNextRound}
                    className="w-full mt-4 bg-[#0058a3] text-white py-4 rounded-full font-bold text-lg hover:bg-[#004280] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {currentRound >= ROUNDS_PER_DAY - 1 ? 'See Results' : 'Next Product'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-blue-200 text-sm">
        <p>Not affiliated with IKEA. Product data from IKEA's public catalog.</p>
      </footer>
    </div>
  );
}

export default App;
