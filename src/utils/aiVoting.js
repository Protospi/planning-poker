import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Define the response format
export const VoteResponse = z.object({
  points: z.number(),
  explanation: z.string()
});

export const getAIVote = async (taskName, taskDescription) => {
  try {
    const prompt = `Atue como um Gerente de Projetos especialista em estimativas de esforço.
    
Analise a tarefa abaixo e vote em quanto esforço será necessário para completá-la.
Você deve escolher um valor dentre as opções: [1, 2, 3, 5, 8]
Onde 1 representa pouco esforço e 8 representa muito esforço.

Nome da Tarefa: ${taskName}
Descrição: ${taskDescription}

Forneça sua estimativa e uma breve explicação em português de 2-3 frases sobre o porquê dessa pontuação.`;

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um Gerente de Projetos experiente especializado em estimativas de esforço." },
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(VoteResponse, "vote"),
    });

    const response = completion.choices[0].message.parsed;
    return response;
  } catch (error) {
    console.error("Error getting AI vote:", error);
    return { points: 3, explanation: "Erro ao gerar estimativa." };
  }
}; 