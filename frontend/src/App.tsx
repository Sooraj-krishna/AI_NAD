import './App.css';

import { ThemeProvider } from "next-themes";
import { HeroSection } from "./components/blocks/hero-section";
import { Icons } from "./components/ui/icons";
import { GeneratePage } from './pages/GeneratePage';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="App dark min-h-screen bg-background text-foreground">
        <HeroSection
          badge={{
            text: "AI-NAD Core v1.0",
            action: {
              text: "Read Docs",
              href: "#",
            },
          }}
          title="Autonomous AI Software Factory"
          description="Build, deploy, and scale microservices instantly. Type your project description and watch the AI engine generate your complete application."
          actions={[
            {
              text: "Start Generating",
              href: "#generator",
              variant: "default",
            },
            {
              text: "GitHub",
              href: "https://github.com/",
              variant: "glow",
              icon: <Icons.gitHub className="h-5 w-5" />,
            },
          ]}
          image={{
            light: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1248&auto=format&fit=crop",
            dark: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=1248&auto=format&fit=crop",
            alt: "Code generation dashboard preview",
          }}
        />
        <main id="generator">
          <GeneratePage />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;


