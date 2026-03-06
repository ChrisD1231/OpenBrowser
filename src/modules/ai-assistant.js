const axios = require('axios');

/**
 * AI Assistant Module (Ollama Integration)
 */
class AIAssistant {
    constructor(model = 'llama3') {
        this.model = model;
        this.baseUrl = 'http://localhost:11434/api';
    }

    /**
     * Set the AI model to use
     * @param {string} model 
     */
    setModel(model) {
        this.model = model;
    }

    /**
     * Ask the AI a question with optional context
     * @param {string} prompt 
     * @param {string} context 
     * @returns {Promise<string>}
     */
    async ask(prompt, context = '') {
        try {
            const systemPrompt = "You are a privacy-focused AI browser assistant. Help the user summarize, explain, or navigate page content.";
            const fullPrompt = context ? `Context from the web page:\n${context}\n\nUser Question: ${prompt}` : prompt;

            const response = await axios.post(`${this.baseUrl}/generate`, {
                model: this.model,
                prompt: fullPrompt,
                system: systemPrompt,
                stream: false
            });

            return response.data.response;
        } catch (error) {
            console.error('AI Assistant Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                return "Error: Ollama is not running. Please start Ollama to use the AI assistant.";
            }
            return `AI Assistant Error: ${error.message}`;
        }
    }

    /**
     * Summarize page content
     * @param {string} textContent 
     * @returns {Promise<string>}
     */
    async summarize(textContent) {
        const prompt = "Please provide a concise summary of the following web page content. Highlight the main points and any potential privacy concerns or scams if detectable.";
        return this.ask(prompt, textContent);
    }

    /**
     * Detect potential scams or suspicious content
     * @param {string} textContent 
     * @returns {Promise<string>}
     */
    async detectScams(textContent) {
        const prompt = "Analyze the following content for potential phishing, scams, or suspicious activity. Provide a risk score from 1-10 and explain why.";
        return this.ask(prompt, textContent);
    }
}

module.exports = AIAssistant;
