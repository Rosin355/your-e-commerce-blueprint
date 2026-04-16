import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
            dark: "hsl(var(--primary-dark))",
            light: "hsl(var(--primary-light))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
            bright: "hsl(var(--accent-bright))",
            "bright-foreground": "hsl(var(--accent-bright-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          success: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          info: "hsl(var(--info))",
          forest: "hsl(var(--forest))",
          sage: "hsl(var(--sage))",
          cream: "hsl(var(--cream))",
          sand: "hsl(var(--sand))",
          "text-primary": "hsl(var(--text-primary))",
          "text-secondary": "hsl(var(--text-secondary))",
          "text-light": "hsl(var(--text-light))",
          "top-bar": "hsl(var(--top-bar))",
          "top-bar-foreground": "hsl(var(--top-bar-foreground))",
          "rating-star": "hsl(var(--rating-star))",
        },
        fontFamily: {
          sans: ['Figtree', 'Inter', 'Arial', 'Helvetica', 'sans-serif'],
          heading: ['Inter', 'Figtree', 'Arial', 'Helvetica', 'sans-serif'],
        },
        fontSize: {
          'hero': ['3rem', { lineHeight: '1.02', fontWeight: '700' }],
          'section': ['2.25rem', { lineHeight: '1.12', fontWeight: '700' }],
          'subsection': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
          'card-title': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        },
        boxShadow: {
          'card': 'var(--shadow-sm)',
          'card-hover': 'var(--shadow-md)',
          'dropdown': 'var(--shadow-lg)',
          'soft': 'var(--shadow-sm)',
          'elevated': 'var(--shadow-md)',
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        backgroundImage: {
          'gradient-card': 'var(--gradient-card)',
          'gradient-showcase': 'var(--gradient-showcase)',
          'gradient-hero': 'var(--gradient-hero)',
        },
        keyframes: {
          "accordion-down": {
            from: {
              height: "0",
            },
            to: {
              height: "var(--radix-accordion-content-height)",
            },
          },
          "accordion-up": {
            from: {
              height: "var(--radix-accordion-content-height)",
            },
            to: {
              height: "0",
            },
          },
          "fade-up": {
            from: { opacity: "0", transform: "translateY(18px)" },
            to: { opacity: "1", transform: "translateY(0)" },
          },
          "float-soft": {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-8px)" },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "fade-up": "fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
          "float-soft": "float-soft 9s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        },
      },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
