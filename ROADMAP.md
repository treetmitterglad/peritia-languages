# Peritia Languages Roadmap

## Version 0.1.0 - Foundation (Completed)

**Status**: Released

### Features
- AI-powered lesson generation with Mistral AI
- Interactive exercises (multiple choice, fill-in-blank, word matching)
- Flashcard system with category-based review
- Progress tracking (XP, streaks, session history)
- Sound effects for feedback (correct, incorrect, completion)
- Performance-based celebrations and animations
- Dark/light theme support
- 21 supported languages
- LocalStorage with encryption for API keys
- Comprehensive error handling
- Docker deployment support

---

## Version 0.2.0 - Voice Integration

**Status**: Planned

### Primary Goals
- Integrate Chatterbox TTS for pronunciation
- Integrate Whisper STT for speech recognition
- Voice-based exercises and practice

### Features
- **Text-to-Speech (Chatterbox)**
  - Native pronunciation for all teaching cards
  - Audio playback for example sentences
  - Adjustable speech rate
  - Voice selection per language

- **Speech-to-Text (Whisper)**
  - Speaking exercises for pronunciation practice
  - Real-time feedback on pronunciation accuracy
  - Voice recording and playback
  - Microphone permission handling

- **New Exercise Types**
  - Speak and repeat exercises
  - Pronunciation scoring
  - Listening comprehension questions
  - Dictation exercises

### Technical Requirements
- Chatterbox API integration
- Whisper API integration
- Audio recording utilities
- Waveform visualization
- Browser microphone permissions

---

## Version 0.3.0 - Enhanced Learning

**Status**: Planned

### Primary Goals
- Improve lesson quality and variety
- Add more exercise types
- Enhanced progress analytics

### Features
- Grammar explanations and tips
- Contextual learning (real-world scenarios)
- Conversation practice mode
- Writing exercises
- Advanced progress analytics dashboard
- Learning streak rewards and milestones
- Achievement system

---

## Version 0.4.0 - Onboarding Improvements

**Status**: Planned

### Primary Goals
- Streamline user onboarding experience
- Better initial assessment
- Personalized learning paths

### Features
- **Enhanced Onboarding Flow**
  - Interactive tutorial
  - Skill level assessment quiz
  - Learning goal selection
  - Personalized study schedule
  - Sample lesson preview

- **User Preferences**
  - Daily study time goals
  - Notification preferences
  - Learning style customization
  - Topic interests selection

- **First-Time Experience**
  - Guided tour of features
  - Quick start lessons
  - Progress visualization
  - Motivation and tips

### UX Improvements
- Simplified API key setup
- Better error messages for new users
- Contextual help and tooltips
- Onboarding progress indicator

---

## Version 0.5.0 - Difficulty & Spaced Repetition

**Status**: Planned

### Primary Goals
- Advanced difficulty management
- Comprehensive spaced repetition system
- Lesson polish and refinement

### Features
- **Difficulty System**
  - Adaptive difficulty based on performance
  - Granular difficulty levels (A1, A2, B1, B2, C1, C2)
  - Difficulty progression tracking
  - Custom difficulty settings per topic
  - Review of challenging concepts

- **Spaced Repetition Enhancement**
  - SM-2 algorithm implementation
  - Intelligent review scheduling
  - Due card notifications
  - Review session optimization
  - Long-term retention tracking
  - Leitner system integration

- **Lesson Polish**
  - Improved lesson structure
  - Better exercise variety within lessons
  - Contextual hints and explanations
  - Progress checkpoints
  - Lesson recommendations based on weak areas

- **Analytics**
  - Retention rate tracking
  - Difficulty progression graphs
  - Time-to-mastery metrics
  - Weak area identification

### Technical Improvements
- Optimized spaced repetition algorithm
- Background sync for review schedules
- Performance optimizations
- Enhanced data persistence

---

## Version 0.6.0 - Social & Gamification

**Status**: Future

### Potential Features
- Leaderboards and competitions
- Friend system and challenges
- Shared progress and achievements
- Community-created content
- Study groups and collaborative learning

---

## Version 0.7.0 - Mobile & Offline

**Status**: Future

### Potential Features
- Progressive Web App (PWA) support
- Offline lesson access
- Mobile-optimized interface
- Native mobile apps (iOS/Android)
- Sync across devices

---

## Version 1.0.0 - Production Release

**Status**: Future

### Goals
- Feature complete
- Production-ready stability
- Comprehensive documentation
- Performance optimization
- Security audit
- Accessibility compliance (WCAG 2.1)

---

## Long-Term Vision

### Advanced Features (Post 1.0)
- Video lessons and content
- Live tutoring integration
- Cultural context and immersion
- Advanced grammar analysis
- Writing correction with AI
- Conversation with AI tutors
- Certificate programs
- Integration with language proficiency tests

### Platform Expansion
- Browser extensions
- Desktop applications
- Smart speaker integration
- Wearable device support

---

## Contributing

We welcome contributions aligned with this roadmap. Please check the current version's goals before submitting features.

## Versioning

We follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes or major feature releases
- MINOR: New features, backward compatible
- PATCH: Bug fixes and minor improvements
