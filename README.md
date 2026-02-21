# Peritia Languages

An AI-powered language learning application that provides personalized lessons, interactive exercises, and spaced repetition flashcards. Built with React, TypeScript, and powered by Mistral AI.

## Features

### Adaptive Learning System
- AI-generated lessons tailored to your proficiency level
- Progressive difficulty scaling from beginner to advanced
- Context-aware content based on your learning history

### Interactive Lessons
- Structured teaching phase with pronunciation guides and examples
- Multiple exercise types: multiple choice, fill-in-the-blank, word matching
- Real-time feedback with audio cues
- Performance-based celebrations and progress tracking

### Flashcard System
- Category-based vocabulary review
- Spaced repetition algorithm for optimal retention
- Flip animations and intuitive navigation

### Progress Tracking
- XP system with milestone rewards
- Daily streak tracking with visual indicators
- Comprehensive session history
- Word count and accuracy metrics

### Supported Languages
Spanish, German, French, Italian, Portuguese, Dutch, Russian, Chinese (Simplified & Traditional), Japanese, Korean, Arabic, Hindi, Turkish, Polish, Swedish, Finnish, Greek, Hebrew, Danish, Norwegian

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Animations**: Framer Motion
- **AI**: Mistral AI API
- **Build Tool**: Vite
- **State Management**: React Hooks
- **Storage**: LocalStorage with encryption

## Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Mistral AI API key ([Get one here](https://console.mistral.ai/))

## Installation

### Standard Installation

1. Clone the repository:
```bash
git clone https://github.com/treetmitterglad/peritia-languages.git
cd peritia-languages
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

### Docker Installation

1. Clone the repository:
```bash
git clone https://github.com/treetmitterglad/peritia-languages.git
cd peritia-languages
```

2. Run the installation script:
```bash
./docker-install.sh
```

3. Open your browser and navigate to `http://localhost:8080`

#### Docker Management Commands

```bash
# View logs
docker-compose logs -f

# Stop the container
docker-compose stop

# Restart the container
docker-compose restart

# Stop and remove the container
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Configuration

### API Key Setup
On first launch, you'll be prompted to enter your Mistral AI API key. The key is encrypted and stored locally in your browser.

### Theme
The application supports light and dark modes. Toggle between themes using the sun/moon icon in the dashboard header.

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard view
│   ├── LessonView.tsx   # Lesson interface
│   ├── FlashcardView.tsx # Flashcard interface
│   ├── Onboarding.tsx   # Initial setup flow
│   └── ui/              # Reusable UI components
├── lib/                 # Core utilities
│   ├── mistral.ts       # AI API integration
│   ├── storage.ts       # LocalStorage management
│   ├── sounds.ts        # Audio feedback system
│   └── types.ts         # TypeScript definitions
├── pages/               # Route components
└── hooks/               # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Error Handling

The application includes comprehensive error handling:

- **API Errors**: Clear messages for authentication, rate limiting, and network issues
- **Data Validation**: Ensures lesson structure integrity before rendering
- **Storage Failures**: Graceful degradation if LocalStorage is unavailable
- **Fallback Content**: Provides basic lessons if AI generation fails

## Audio Feedback

Sound effects are located in `public/sounds/`:
- `correct.wav` - Played on correct answers
- `fail.wav` - Played on incorrect answers
- `finished.wav` - Played on lesson completion

Audio is non-blocking and will not interrupt the user experience if playback fails.

## Performance Optimizations

- Lazy loading of components
- Optimized animations using GPU acceleration
- Efficient state management with React hooks
- Compressed context for API calls to reduce token usage

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Security

- API keys are encrypted before storage
- No sensitive data is transmitted to third parties
- All API calls use HTTPS
- Input sanitization on user-generated content

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Troubleshooting

### Build Errors
Ensure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

### API Key Issues
- Verify your Mistral AI API key is valid
- Check that you have sufficient API credits
- Ensure your network allows connections to api.mistral.ai

### Audio Not Playing
- Check browser audio permissions
- Verify sound files exist in `public/sounds/`
- Try a different browser if issues persist

## Support

For issues, questions, or feature requests, please open an issue in the repository.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Mistral AI](https://mistral.ai/)
- Icons from [Lucide](https://lucide.dev/)
