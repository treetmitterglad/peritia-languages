import { useState, useEffect } from "react";
import { Difficulty, LanguageCode } from "@/lib/types";
import { getApiKey, getAppState, saveAppState } from "@/lib/storage";
import Onboarding from "@/components/Onboarding";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [state, setState] = useState(getAppState());
  const hasKey = !!getApiKey();

  const handleOnboardingComplete = (language: LanguageCode, difficulty: Difficulty) => {
    const newState = {
      ...state,
      currentLanguage: language,
      difficulty,
      onboarded: true,
      apiKey: "set",
    };
    saveAppState(newState);
    setState(newState);
  };

  if (!hasKey || !state.onboarded || !state.currentLanguage) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Dashboard
      language={state.currentLanguage}
      difficulty={state.difficulty}
      onChangeLanguage={() => {
        const newState = { ...state, onboarded: false };
        saveAppState(newState);
        setState(newState);
      }}
      onLogout={() => {
        const newState = { ...state, onboarded: false, apiKey: null };
        saveAppState(newState);
        setState(newState);
      }}
    />
  );
};

export default Index;
