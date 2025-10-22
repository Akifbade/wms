
import { GoogleGenAI, Type } from '@google/genai';
import type { JobFile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRemarks = async (jobFile: Partial<JobFile>): Promise<string> => {
    const prompt = `
        Generate professional remarks for a freight forwarding job file with the following details.
        The remarks should be concise and summarize the key aspects of the shipment.

        - Product Type: ${(jobFile.pt || []).join(', ') || 'Not specified'}
        - Clearance Type: ${(jobFile.cl || []).join(', ') || 'Not specified'}
        - Shipper: ${jobFile.sh || 'Not specified'}
        - Consignee: ${jobFile.co || 'Not specified'}
        - Origin: ${jobFile.or || 'Not specified'}
        - Destination: ${jobFile.de || 'Not specified'}
        - Description of Goods: ${jobFile.dsc || 'Not specified'}
        - Carrier: ${jobFile.ca || 'Not specified'}
        - MAWB/OBL: ${jobFile.mawb || 'Not specified'}

        Generate a short paragraph suitable for the remarks section.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for remarks:", error);
        throw new Error("Failed to generate remarks from AI.");
    }
};

interface SuggestedCharge {
    chargeName: string;
    cost: number;
    selling: number;
}

export const suggestCharges = async (jobFile: Partial<JobFile>, predefinedCharges: string[]): Promise<SuggestedCharge[]> => {
    const prompt = `
        Based on the following freight forwarding job details, suggest typical cost and selling prices in Kuwaiti Dinar (KD) for relevant charges.
        Provide reasonable, non-zero estimates for relevant charges. Only include charges that are applicable.
        
        - Product Type: ${(jobFile.pt || []).join(', ') || 'General'}
        - Clearance Type: ${(jobFile.cl || []).join(', ') || 'Standard'}
        - Origin: ${jobFile.or || 'Unknown'}
        - Destination: ${jobFile.de || 'Kuwait'}
        - Description of Goods: ${jobFile.dsc || 'General Goods'}
        - Gross Weight: ${jobFile.gw || 'N/A'}
        - Predefined Charges list to pick from: ${predefinedCharges.join(', ')}

        From the predefined charges list, which ones are most relevant? Provide their estimated costs and selling prices in a JSON array. Only include charges from the provided list.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            chargeName: { type: Type.STRING },
                            cost: { type: Type.NUMBER },
                            selling: { type: Type.NUMBER }
                        },
                        required: ["chargeName", "cost", "selling"]
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        // FIX: The response from the API with a responseSchema is a JSON string. It needs to be parsed.
        const parsedJson = JSON.parse(jsonText);

        // With the responseSchema defined to return an array, this logic is simplified to validate
        // that the response is an array, removing the previous fallback for a wrapped object.
        if (Array.isArray(parsedJson)) {
            return parsedJson;
        } else {
            console.error("Invalid JSON structure in API response for charges. Expected an array but got:", parsedJson);
            throw new Error("Invalid JSON structure in API response for charges.");
        }
    } catch (error) {
        console.error("Error calling Gemini API for charges:", error);
        throw new Error("Failed to suggest charges from AI.");
    }
};