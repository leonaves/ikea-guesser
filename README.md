# IKEA Price Guesser

A fun web game that tests your knowledge of IKEA product prices! Random products are fetched from IKEA's catalog and you guess the price using a slider.

## Features

- Random IKEA products from their catalog
- Interactive price guessing with a slider
- Score tracking with accuracy percentages
- Streak tracking for consecutive good guesses
- Confetti celebration for excellent guesses
- Links to view products on IKEA.com
- Mobile-responsive design with IKEA-inspired styling

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Cloudflare Pages + Functions for deployment

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run with Cloudflare Pages functions locally
npm run pages:dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to Cloudflare Pages

### Option 1: CLI Deployment

```bash
npm run pages:deploy
```

### Option 2: Git Integration

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Cloudflare will automatically deploy on push

## Project Structure

```
├── functions/
│   └── api/
│       └── ikea-search.ts    # Cloudflare Function to proxy IKEA API
├── src/
│   ├── services/
│   │   └── ikea.ts           # IKEA API service
│   ├── types/
│   │   └── ikea.ts           # TypeScript types
│   ├── App.tsx               # Main game component
│   ├── App.css               # Component styles
│   ├── index.css             # Global styles + Tailwind
│   └── main.tsx              # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── wrangler.toml             # Cloudflare Pages config
```

## How It Works

1. The app fetches random products using IKEA's search API
2. A Cloudflare Pages Function proxies requests to avoid CORS issues
3. Products are parsed and filtered for valid prices and images
4. Users guess the price using an interactive slider
5. Accuracy is calculated and points are awarded

## Disclaimer

This project is not affiliated with IKEA. Product data is fetched from IKEA's public-facing catalog API.
