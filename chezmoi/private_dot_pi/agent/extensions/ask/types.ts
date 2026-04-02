export type QuestionType = "select" | "text" | "textarea";
export type AnswerSource = "option" | "custom" | "mixed" | "text";

export interface AskOptionInput {
	value?: string;
	label: string;
	description?: string;
}

export interface AskQuestionInput {
	id: string;
	label?: string;
	question: string;
	type?: QuestionType;
	context?: string;
	options?: AskOptionInput[];
	multi?: boolean;
	recommended?: number;
	allowOther?: boolean;
	required?: boolean;
	placeholder?: string;
}

export interface AskOption {
	value: string;
	label: string;
	description?: string;
}

export interface AskQuestion {
	id: string;
	label: string;
	question: string;
	type: QuestionType;
	context?: string;
	options: AskOption[];
	multi: boolean;
	recommended?: number;
	allowOther: boolean;
	required: boolean;
	placeholder?: string;
}

export interface AskAnswer {
	id: string;
	label: string;
	type: QuestionType;
	value: string | string[];
	displayValue: string | string[];
	source: AnswerSource;
	indices?: number[];
}

export interface AskResult {
	status: "submitted" | "cancelled" | "error";
	questions: AskQuestion[];
	answers: AskAnswer[];
	error?: string;
}

export interface ExtractedQuestion {
	question: string;
	context?: string;
}

export interface ExtractionResult {
	questions: ExtractedQuestion[];
}
