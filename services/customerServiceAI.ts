/**
 * Customer Service AI Service
 * 
 * This service handles:
 * 1. Sending text/audio to the AI for processing
 * 2. Managing clarification sessions
 * 3. Converting audio to text via Whisper
 */

import { supabase } from './supabaseClient';

// ============================================
// Types
// ============================================
export interface ClarificationPage {
  pageNumber: number;
  totalPages: number;
  question: string;
  answer?: string;
}

export interface FinalReview {
  title: string;
  reformulated_request: string;
  system_category: string;
  new_category_suggestion: string;
  location?: string; // الموقع المستخرج من الطلب
  ui_action: string;
}

export interface CustomerServiceResponse {
  success: boolean;
  data?: {
    scratchpad: string;
    language_detected: string;
    clarification_needed: boolean;
    total_pages: number;
    clarification_pages: string[];
    final_review: FinalReview;
  };
  meta?: {
    model: string;
    categories_count: number;
    has_audio: boolean;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

export interface CustomerServiceSession {
  id: string;
  rawInput: string;
  transcribedAudio?: string;
  clarificationPages: ClarificationPage[];
  currentPage: number;
  answers: Record<string, string>;
  finalReview?: FinalReview;
  languageDetected?: string;
  status: 'in_progress' | 'clarifying' | 'ready_to_submit' | 'submitted';
  createdAt: Date;
}

// ============================================
// Session Management
// ============================================
const sessions = new Map<string, CustomerServiceSession>();

export function createSession(rawInput: string, transcribedAudio?: string): CustomerServiceSession {
  const session: CustomerServiceSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    rawInput,
    transcribedAudio,
    clarificationPages: [],
    currentPage: 0,
    answers: {},
    status: 'in_progress',
    createdAt: new Date(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(sessionId: string): CustomerServiceSession | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, updates: Partial<CustomerServiceSession>): CustomerServiceSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  
  const updated = { ...session, ...updates };
  sessions.set(sessionId, updated);
  return updated;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

// ============================================
// Audio Recording Utilities
// ============================================
export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================
// Main API Call
// ============================================
export async function processCustomerRequest(
  text?: string,
  audioBlob?: Blob,
  previousAnswers?: Record<string, string>
): Promise<CustomerServiceResponse> {
  try {
    console.log('🔄 Processing customer service request...');
    
    // Prepare request body
    const body: {
      text?: string;
      audioBase64?: string;
      audioMimeType?: string;
      previousAnswers?: Record<string, string>;
    } = {};

    if (text) {
      body.text = text;
    }

    if (audioBlob) {
      console.log('🎤 Converting audio to base64...');
      body.audioBase64 = await convertBlobToBase64(audioBlob);
      body.audioMimeType = audioBlob.type || 'audio/webm';
    }

    if (previousAnswers && Object.keys(previousAnswers).length > 0) {
      body.previousAnswers = previousAnswers;
    }

    // Call Edge Function
    console.log('📡 Calling customer-service-ai Edge Function...');
    const { data, error } = await supabase.functions.invoke('customer-service-ai', {
      body,
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      return {
        success: false,
        error: 'فشل الاتصال بالذكاء الاصطناعي',
        details: error.message,
      };
    }

    console.log('✅ Response received:', data);
    return data as CustomerServiceResponse;
    
  } catch (err) {
    console.error('❌ Error in processCustomerRequest:', err);
    return {
      success: false,
      error: 'حدث خطأ غير متوقع',
      details: String(err),
    };
  }
}

// ============================================
// High-Level Session Flow
// ============================================

/**
 * Start a new customer service interaction
 */
export async function startInteraction(
  text?: string,
  audioBlob?: Blob
): Promise<{
  session: CustomerServiceSession;
  response: CustomerServiceResponse;
}> {
  // Process the request
  const response = await processCustomerRequest(text, audioBlob);
  
  // Create session
  const session = createSession(
    text || '',
    response.data?.language_detected
  );

  if (response.success && response.data) {
    session.languageDetected = response.data.language_detected;
    
    if (response.data.clarification_needed) {
      // Parse clarification pages
      session.clarificationPages = response.data.clarification_pages.map((page, index) => {
        // Parse "Page X/Y: Question" format
        const match = page.match(/Page (\d+)\/(\d+):\s*(.+)/i) ||
                      page.match(/صفحة (\d+)\/(\d+):\s*(.+)/);
        
        return {
          pageNumber: match ? parseInt(match[1]) : index + 1,
          totalPages: match ? parseInt(match[2]) : response.data!.total_pages,
          question: match ? match[3] : page,
        };
      });
      session.currentPage = 1;
      session.status = 'clarifying';
    } else {
      // No clarification needed
      session.finalReview = response.data.final_review;
      session.status = 'ready_to_submit';
    }
  }

  updateSession(session.id, session);
  
  return { session, response };
}

/**
 * Answer a clarification question and proceed
 */
export async function answerClarification(
  sessionId: string,
  answer: string
): Promise<{
  session: CustomerServiceSession;
  response?: CustomerServiceResponse;
  needsMoreClarification: boolean;
}> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Record the answer
  const currentQuestion = session.clarificationPages[session.currentPage - 1]?.question || '';
  session.answers[currentQuestion] = answer;
  session.clarificationPages[session.currentPage - 1].answer = answer;
  
  // Check if more clarification needed
  if (session.currentPage < session.clarificationPages.length) {
    // Move to next page
    session.currentPage++;
    updateSession(sessionId, session);
    
    return {
      session,
      needsMoreClarification: true,
    };
  }

  // All clarifications collected - reprocess with answers
  const response = await processCustomerRequest(
    session.rawInput,
    undefined, // No new audio
    session.answers
  );

  if (response.success && response.data) {
    if (response.data.clarification_needed) {
      // AI still needs more clarification (shouldn't happen often)
      session.clarificationPages = response.data.clarification_pages.map((page, index) => ({
        pageNumber: index + 1,
        totalPages: response.data!.total_pages,
        question: page,
      }));
      session.currentPage = 1;
      session.status = 'clarifying';
      updateSession(sessionId, session);
      
      return {
        session,
        response,
        needsMoreClarification: true,
      };
    } else {
      // Ready to submit
      session.finalReview = response.data.final_review;
      session.status = 'ready_to_submit';
      updateSession(sessionId, session);
      
      return {
        session,
        response,
        needsMoreClarification: false,
      };
    }
  }

  return {
    session,
    response,
    needsMoreClarification: false,
  };
}

/**
 * Get current clarification question
 */
export function getCurrentQuestion(sessionId: string): ClarificationPage | null {
  const session = getSession(sessionId);
  if (!session || session.status !== 'clarifying') return null;
  
  return session.clarificationPages[session.currentPage - 1] || null;
}

/**
 * Get progress info
 */
export function getProgress(sessionId: string): {
  currentPage: number;
  totalPages: number;
  percentComplete: number;
} | null {
  const session = getSession(sessionId);
  if (!session) return null;
  
  const total = session.clarificationPages.length || 1;
  const current = session.currentPage;
  
  return {
    currentPage: current,
    totalPages: total,
    percentComplete: Math.round((current / total) * 100),
  };
}

