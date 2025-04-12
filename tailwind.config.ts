import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Cyberpunk theme colors
				cyberpunk: {
					'dark': '#0D0221',
					'darker': '#05010F',
					'darkest': '#020008',
					'dark-blue': '#1F2041',
					'neon-green': '#00FF41',
					'neon-green-dark': '#00C852',
					'neon-blue': '#0AFFFF',
					'neon-blue-dark': '#00C8C8',
					'neon-purple': '#9D00FF',
					'neon-purple-dark': '#7800C8',
					'neon-pink': '#FF00A0',
					'neon-pink-dark': '#C80080',
					'terminal-green': '#33FF33',
					'terminal-green-dark': '#00C800',
					'grid': '#1A3A3A',
					'grid-dark': '#0D1D1D',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				blink: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' },
				},
				scanline: {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(100%)' },
				},
				typing: {
					'0%': { width: '0' },
					'100%': { width: '100%' },
				},
				flicker: {
					'0%, 100%': { opacity: '1' },
					'10%, 30%, 50%, 70%, 90%': { opacity: '0.8' },
					'20%, 40%, 60%, 80%': { opacity: '0.9' },
				},
				glitch: {
					'0%, 100%': { transform: 'translate(0)' },
					'20%': { transform: 'translate(-2px, 2px)' },
					'40%': { transform: 'translate(2px, -2px)' },
					'60%': { transform: 'translate(-2px, -2px)' },
					'80%': { transform: 'translate(2px, 2px)' },
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				progress: {
					'0%': { width: '0%' },
					'100%': { width: '100%' },
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'blink': 'blink 1s step-end infinite',
				'scanline': 'scanline 8s linear infinite',
				'typing': 'typing 3.5s steps(40, end)',
				'flicker': 'flicker 0.5s linear infinite',
				'glitch': 'glitch 0.3s ease infinite',
				'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'progress': 'progress 2s ease-in-out forwards'
			},
			fontFamily: {
				'terminal': ['VT323', 'monospace', 'ui-monospace', 'SFMono-Regular'],
				'pixel': ['Press Start 2P', 'cursive'],
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
