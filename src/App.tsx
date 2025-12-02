import { useState, useEffect, useCallback } from 'react';
import type { IkeaProduct } from './types/ikea';
import { fetchRandomProduct, formatPrice, calculateAccuracy, getAccuracyMessage } from './services/ikea';
import './App.css';

type GameState = 'loading' | 'guessing' | 'revealed' | 'error';

function App() {
  const [product, setProduct] = useState<IkeaProduct | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [guess, setGuess] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadNewProduct = useCallback(async () => {
    setGameState('loading');
    setErrorMessage('');
    try {
      const newProduct = await fetchRandomProduct();
      setProduct(newProduct);
      // Set initial guess to middle of reasonable range
      const maxGuess = Math.min(newProduct.price.currentPrice * 3, 1000);
      setGuess(Math.round(maxGuess / 2));
      setGameState('guessing');
    } catch (error) {
      console.error('Failed to load product:', error);
      setErrorMessage('Failed to load product. Please try again!');
      setGameState('error');
    }
  }, []);

  useEffect(() => {
    loadNewProduct();
  }, [loadNewProduct]);

  const handleSubmitGuess = () => {
    if (!product) return;

    const accuracyValue = calculateAccuracy(guess, product.price.currentPrice);
    setAccuracy(accuracyValue);
    setTotalRounds(prev => prev + 1);

    // Add points based on accuracy
    const pointsEarned = Math.round(accuracyValue);
    setScore(prev => prev + pointsEarned);

    // Handle streak
    if (accuracyValue >= 70) {
      setStreak(prev => prev + 1);
      if (accuracyValue >= 85) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    } else {
      setStreak(0);
    }

    setGameState('revealed');
  };

  const handleNextProduct = () => {
    loadNewProduct();
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

      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          <span className="text-[#ffdb00]">IKEA</span> Price Guesser
        </h1>
        <p className="text-blue-200 text-lg">How well do you know Swedish prices?</p>
      </header>

      {/* Score display */}
      <div className="flex gap-6 mb-6 text-white">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
          <div className="text-2xl font-bold text-[#ffdb00]">{score}</div>
          <div className="text-xs uppercase tracking-wider text-blue-200">Score</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
          <div className="text-2xl font-bold text-[#ffdb00]">{totalRounds}</div>
          <div className="text-xs uppercase tracking-wider text-blue-200">Rounds</div>
        </div>
        {streak > 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center animate-pulse-glow">
            <div className="text-2xl font-bold text-[#ffdb00]">{streak}🔥</div>
            <div className="text-xs uppercase tracking-wider text-blue-200">Streak</div>
          </div>
        )}
      </div>

      {/* Main game card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {gameState === 'loading' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-[#0058a3] border-t-[#ffdb00] rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading product...</p>
          </div>
        )}

        {gameState === 'error' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-6xl mb-4">😕</div>
            <p className="text-gray-600 mb-4 text-center">{errorMessage}</p>
            <button
              onClick={loadNewProduct}
              className="bg-[#0058a3] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#004280] transition-colors"
            >
              Try Again
            </button>
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
                <img
                  src={product.contextualImageUrl}
                  alt="Context"
                  className="absolute bottom-2 right-2 w-16 h-16 rounded-lg border-2 border-white shadow-lg object-cover"
                />
              )}
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
                        {formatPrice(guess)}
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
                      <span>{formatPrice(1)}</span>
                      <span>{formatPrice(getSliderMax())}</span>
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
                          Your guess: <span className="font-semibold">{formatPrice(guess)}</span>
                        </div>
                        <div className="text-gray-900">
                          Actual price: <span className="font-bold text-[#0058a3] text-xl">{formatPrice(product.price.currentPrice)}</span>
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
                    onClick={handleNextProduct}
                    className="w-full mt-4 bg-[#0058a3] text-white py-4 rounded-full font-bold text-lg hover:bg-[#004280] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Next Product
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
