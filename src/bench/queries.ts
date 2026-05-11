import type { BenchQuery } from './types.js'

/**
 * 20 BrainBench queries with ground-truth relevant page IDs.
 * Covers cross-domain retrieval: company + model + person + concept + tool.
 */
export const QUERIES: BenchQuery[] = [
  {
    id: 'q01',
    text: 'OpenAI GPT-4 large language model capabilities',
    relevantIds: ['gpt-4', 'openai', 'sam-altman', 'ilya-sutskever'],
  },
  {
    id: 'q02',
    text: 'Anthropic Claude AI safety alignment',
    relevantIds: ['claude-3', 'anthropic', 'dario-amodei', 'constitutional-ai'],
  },
  {
    id: 'q03',
    text: 'DeepMind Google Gemini multimodal model',
    relevantIds: ['gemini', 'deepmind', 'demis-hassabis'],
  },
  {
    id: 'q04',
    text: 'Meta open source Llama language model weights',
    relevantIds: ['llama-3', 'meta-ai', 'yann-lecun'],
  },
  {
    id: 'q05',
    text: 'transformer self-attention neural network architecture',
    relevantIds: ['transformer', 'attention-mechanism', 'pytorch'],
  },
  {
    id: 'q06',
    text: 'retrieval augmented generation RAG knowledge grounding',
    relevantIds: ['rag', 'vector-db', 'embeddings', 'langchain', 'llamaindex'],
  },
  {
    id: 'q07',
    text: 'Sam Altman OpenAI CEO leadership',
    relevantIds: ['sam-altman', 'openai'],
  },
  {
    id: 'q08',
    text: 'vector database similarity search embeddings',
    relevantIds: ['vector-db', 'chromadb', 'faiss', 'pinecone', 'embeddings'],
  },
  {
    id: 'q09',
    text: 'PyTorch deep learning framework training',
    relevantIds: ['pytorch', 'tensorflow'],
  },
  {
    id: 'q10',
    text: 'RLHF fine-tuning alignment human feedback',
    relevantIds: ['rlhf', 'fine-tuning', 'constitutional-ai'],
  },
  {
    id: 'q11',
    text: 'Yann LeCun Meta AI research open source advocate',
    relevantIds: ['yann-lecun', 'meta-ai'],
  },
  {
    id: 'q12',
    text: 'Andrej Karpathy neural network education PyTorch',
    relevantIds: ['andrej-karpathy', 'pytorch'],
  },
  {
    id: 'q13',
    text: 'LangChain LlamaIndex LLM application framework',
    relevantIds: ['langchain', 'llamaindex'],
  },
  {
    id: 'q14',
    text: 'Ilya Sutskever OpenAI co-founder GPT research',
    relevantIds: ['ilya-sutskever', 'openai', 'gpt-4'],
  },
  {
    id: 'q15',
    text: 'Mixture of Experts sparse MoE architecture efficient LLM',
    relevantIds: ['mixture-of-experts', 'mistral-7b', 'gpt-4', 'grok-1'],
  },
  {
    id: 'q16',
    text: 'Ollama local LLM inference privacy GPU',
    relevantIds: ['ollama', 'vllm', 'llama-3'],
  },
  {
    id: 'q17',
    text: 'Yoshua Bengio deep learning pioneer Turing Award',
    relevantIds: ['yoshua-bengio', 'pytorch'],
  },
  {
    id: 'q18',
    text: 'Constitutional AI Anthropic harmless helpful honest principles',
    relevantIds: ['constitutional-ai', 'anthropic', 'claude-3', 'dario-amodei'],
  },
  {
    id: 'q19',
    text: 'embedding vector representation semantic search',
    relevantIds: ['embeddings', 'vector-db', 'rag'],
  },
  {
    id: 'q20',
    text: 'chain of thought reasoning step by step prompting',
    relevantIds: ['chain-of-thought', 'gpt-4', 'claude-3'],
  },
]
