/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.{html,js}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Unbounded', 'sans-serif'],
            },
            colors: {
                brand: {
                    orange: '#FF8C42',
                    red: '#FF2E2E',
                    dark: '#050505',
                    card: '#0A0A0B',
                    light: '#E2E2E2'
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        }
    },
    plugins: [],
}
