import { supabase } from "../lib/supabaseClient";

export async function askAI(prompt: string) {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { prompt },
    });
    if (error) throw error;
    return data.text as string;
}
