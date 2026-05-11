import type { BenchCorpusPage } from './types.js'

/**
 * BrainBench corpus — 50 pages across 5 domains.
 *
 * Wikilinks ([[Title]]) create backlink relationships used by the graph boost.
 * Each page uses consistent terminology to support TF-IDF vector retrieval.
 */
export const CORPUS: BenchCorpusPage[] = [
  // ── Domain 1: AI Companies (10 pages) ─────────────────────────────────────
  {
    id: 'openai',
    title: 'OpenAI',
    content: `OpenAI is an AI safety company and research laboratory founded in 2015. It developed [[GPT-4]], [[GPT-3]], and the DALL-E image generation model. OpenAI created ChatGPT, the fastest-growing consumer application in history. The company is led by CEO [[Sam Altman]] and was co-founded by [[Ilya Sutskever]] and others. OpenAI operates as a capped-profit company with a mission to ensure artificial general intelligence benefits humanity. Notable products include the GPT API, Codex, and Whisper speech recognition. #ai #company #llm`,
  },
  {
    id: 'anthropic',
    title: 'Anthropic',
    content: `Anthropic is an AI safety company founded in 2021 by [[Dario Amodei]], Daniela Amodei, and other former OpenAI researchers. Anthropic developed [[Claude 3]], a family of large language models. The company focuses on AI safety research and developed [[Constitutional AI]], a technique for training helpful, harmless, and honest models. Anthropic raised over $7 billion in funding from Google and Amazon. The company publishes interpretability and alignment research. #ai #safety #company`,
  },
  {
    id: 'deepmind',
    title: 'DeepMind',
    content: `DeepMind is a leading AI research laboratory based in London, acquired by Google in 2014. It is led by CEO and co-founder [[Demis Hassabis]]. DeepMind created AlphaGo, AlphaFold for protein structure prediction, and [[Gemini]], Google's flagship large language model. The lab has published landmark research in reinforcement learning, AlphaStar, and AlphaCode. DeepMind merged with Google Brain to form Google DeepMind in 2023. #ai #research #deeplearning`,
  },
  {
    id: 'mistral-ai',
    title: 'Mistral AI',
    content: `Mistral AI is a French AI company founded in 2023 by [[Arthur Mensch]] and former DeepMind and Meta AI researchers. Mistral released [[Mistral 7B]], a highly capable open-weight language model that outperformed Llama 2 13B. The company also released Mixtral 8x7B, which pioneered sparse [[Mixture of Experts]] architecture in open models. Mistral raised €600 million in Series B funding. Le Chat is Mistral's consumer chatbot product. #ai #company #openweight`,
  },
  {
    id: 'meta-ai',
    title: 'Meta AI',
    content: `Meta AI is the artificial intelligence research division of Meta Platforms. Led by chief AI scientist [[Yann LeCun]], Meta AI conducts fundamental research and develops large language models including the [[Llama 3]] family. Meta takes an open-source approach to AI, releasing model weights publicly. Meta AI Research (FAIR) has contributed foundational work on convolutional networks, self-supervised learning, and PyTorch. #ai #research #opensource`,
  },
  {
    id: 'cohere',
    title: 'Cohere',
    content: `Cohere is a Canadian AI company specializing in natural language processing for enterprise applications. It was founded in 2019 by former Google Brain researchers including Aidan Gomez. Cohere offers Command, Embed, and Rerank APIs. The [[Command R+]] model supports retrieval-augmented generation with 128k context. Cohere focuses on deployment security and data privacy for enterprise customers. Embeddings from Cohere power semantic search and [[RAG (Retrieval-Augmented Generation)]] pipelines. #ai #enterprise #nlp`,
  },
  {
    id: 'xai',
    title: 'xAI',
    content: `xAI is an artificial intelligence company founded by Elon Musk in 2023. It developed [[Grok-1]], a large language model trained on web data and integrated with X (formerly Twitter). Grok is available to X Premium+ subscribers. xAI released the [[Grok-1]] model weights as open source under Apache 2.0 license. The company aims to understand the fundamental nature of the universe through AI. #ai #company #llm`,
  },
  {
    id: 'hugging-face',
    title: 'Hugging Face',
    content: `Hugging Face is a machine learning platform and open-source community hub. It hosts over 500,000 models, 150,000 datasets, and thousands of ML applications (Spaces). The Transformers library by Hugging Face provides unified access to [[PyTorch]] and [[TensorFlow]] pretrained models. Hugging Face maintains the Open LLM Leaderboard evaluating models including [[Llama 3]], [[Mistral 7B]], and [[Falcon 180B]]. #ml #platform #opensource`,
  },
  {
    id: 'inflection',
    title: 'Inflection AI',
    content: `Inflection AI was founded in 2022 by Mustafa Suleyman and Reid Hoffman. The company developed Pi, a personal AI assistant focused on emotional intelligence and empathetic conversation. Inflection trained the Inflection-2 large language model. In 2024, Microsoft acquired key Inflection talent and Mustafa Suleyman became CEO of Microsoft AI. Inflection pioneered conversational AI with memory and personalization features. #ai #assistant #company`,
  },
  {
    id: 'stability-ai',
    title: 'Stability AI',
    content: `Stability AI is an AI company known for Stable Diffusion, a text-to-image latent diffusion model released as open source. Founded by Emad Mostaque in 2020, Stability AI also develops language models including StableLM. The company supports open-source AI development and provides a cloud API for generative AI. Stable Diffusion can run locally on consumer GPUs. Stability AI contributed to the democratization of generative AI. #generativeai #diffusion #opensource`,
  },

  // ── Domain 2: AI Models (10 pages) ────────────────────────────────────────
  {
    id: 'gpt-4',
    title: 'GPT-4',
    content: `GPT-4 is a large multimodal language model developed by [[OpenAI]], released in March 2023. It accepts text and image inputs and produces text outputs. GPT-4 achieves human-level performance on professional benchmarks including the bar exam and medical licensing exams. The model uses a [[Transformer Architecture]] with an unknown parameter count. GPT-4 Turbo extended the context window to 128k tokens. GPT-4 employs [[RLHF]] and [[Constitutional AI]]-style techniques for alignment. [[Chain of Thought]] prompting significantly improves GPT-4 reasoning. #llm #openai #multimodal`,
  },
  {
    id: 'claude-3',
    title: 'Claude 3',
    content: `Claude 3 is a family of large language models developed by [[Anthropic]], released in March 2024. The family includes Claude 3 Haiku, Claude 3 Sonnet, and Claude 3 Opus. Claude 3 Opus outperformed GPT-4 on multiple benchmarks at launch. Claude models are trained using [[Constitutional AI]] and RLHF for safety. Claude 3 supports a 200k token context window. [[Dario Amodei]] leads Anthropic, which developed Claude. [[Chain of Thought]] reasoning is built into Claude's architecture. #llm #anthropic #safety`,
  },
  {
    id: 'gemini',
    title: 'Gemini',
    content: `Gemini is a family of multimodal large language models developed by [[DeepMind]] and Google. Released in December 2023, Gemini Ultra, Pro, and Nano variants offer different capability-efficiency tradeoffs. Gemini Ultra was the first model to outperform human experts on MMLU. [[Demis Hassabis]] led the Gemini development at Google DeepMind. Gemini 1.5 introduced a 1 million token context window using a [[Mixture of Experts]] architecture. Gemini powers Google Search AI features and the Bard/Gemini chatbot. #llm #google #multimodal`,
  },
  {
    id: 'llama-3',
    title: 'Llama 3',
    content: `Llama 3 is an open-weight large language model family released by [[Meta AI]] in April 2024. Available in 8B and 70B parameter variants, with a 400B model released later. Llama 3 uses a [[Transformer Architecture]] with grouped query attention. Meta AI released Llama 3 under a custom license allowing commercial use. [[Yann LeCun]] champions open-weight models as safer than closed models. Llama 3 can be run locally using [[Ollama]] and fine-tuned with [[PyTorch]]. The 70B variant achieves GPT-3.5 level performance. #llm #opensource #meta`,
  },
  {
    id: 'mistral-7b',
    title: 'Mistral 7B',
    content: `Mistral 7B is a large language model released by [[Mistral AI]] in September 2023. Despite its relatively small 7 billion parameter size, it outperforms [[Llama 3]] 13B on most benchmarks. Mistral 7B uses sliding window attention and grouped query attention for efficiency. Mixtral 8x7B is a [[Mixture of Experts]] variant that activates only 12B parameters per token. [[Arthur Mensch]] co-founded Mistral AI and led the development. Available on [[Hugging Face]] and runnable with [[Ollama]]. #llm #efficient #openweight`,
  },
  {
    id: 'phi-3',
    title: 'Phi-3',
    content: `Phi-3 is a family of small language models developed by Microsoft Research. Phi-3 Mini has only 3.8 billion parameters but achieves performance comparable to models 10x larger. The Phi series demonstrates that high-quality training data matters more than raw parameter count. Phi-3 models use a [[Transformer Architecture]] with dense attention. Microsoft trained Phi-3 on curated synthetic data. Phi-3 can run on-device for mobile and edge computing applications. #slm #microsoft #efficient`,
  },
  {
    id: 'command-r',
    title: 'Command R+',
    content: `Command R+ is a large language model developed by [[Cohere]] for enterprise retrieval-augmented generation. Released in April 2024, it has 104 billion parameters and supports 10 languages. Command R+ is optimized for [[RAG (Retrieval-Augmented Generation)]] workflows with 128k context and tool use. It outperforms GPT-4 and [[Claude 3]] on RAG benchmarks. Cohere designed Command R+ for deployment in enterprise cloud environments with data privacy controls. #llm #enterprise #rag`,
  },
  {
    id: 'falcon-180b',
    title: 'Falcon 180B',
    content: `Falcon 180B is a large language model developed by the Technology Innovation Institute in Abu Dhabi. With 180 billion parameters, it was the largest publicly available open-weight model at launch in September 2023. Falcon 180B was trained on 3.5 trillion tokens using the RefinedWeb dataset. Available on [[Hugging Face]], it supports commercial use. Falcon uses a [[Transformer Architecture]] with multi-query attention for inference efficiency. Requires multiple high-memory GPUs to run. #llm #openweight #large`,
  },
  {
    id: 'grok-1',
    title: 'Grok-1',
    content: `Grok-1 is a large language model developed by [[xAI]], Elon Musk's AI company. With 314 billion parameters, it uses a [[Mixture of Experts]] architecture with 8 experts and 2 active per token. Grok-1 was trained on a dataset of internet data and books. xAI released the Grok-1 weights under Apache 2.0 license in March 2024. Grok is integrated with X (formerly Twitter) for real-time information access. #llm #openweight #moe`,
  },
  {
    id: 'yi-34b',
    title: 'Yi-34B',
    content: `Yi-34B is a large language model developed by 01.AI, founded by Kai-Fu Lee. With 34 billion parameters, Yi-34B achieves GPT-3.5 level performance on benchmarks. The model was trained on a mix of English and Chinese text. Available on [[Hugging Face]] with a permissive license. Yi models support 200k extended context via position interpolation. 01.AI also released Yi-9B for more efficient deployment. #llm #chinese #multilingual`,
  },

  // ── Domain 3: Key People (10 pages) ───────────────────────────────────────
  {
    id: 'sam-altman',
    title: 'Sam Altman',
    content: `Sam Altman is the CEO of [[OpenAI]], the AI safety company behind [[GPT-4]] and ChatGPT. He was previously President of Y Combinator. Altman was briefly ousted from OpenAI in November 2023 before being reinstated after employee support. Under his leadership, OpenAI became a $157 billion company. Altman advocates for accelerating AI development while investing in safety research. He has testified before the US Senate on AI regulation. #person #ceo #openai`,
  },
  {
    id: 'dario-amodei',
    title: 'Dario Amodei',
    content: `Dario Amodei is the CEO and co-founder of [[Anthropic]], the AI safety company that created [[Claude 3]]. Previously, he was VP of Research at [[OpenAI]], where he worked on large language model scaling. Amodei co-authored the scaling laws paper with Jared Kaplan. He is a strong advocate for [[Constitutional AI]] and AI safety research. His sister Daniela Amodei is Anthropic's President. Anthropic has raised $7+ billion under his leadership. #person #ceo #safety`,
  },
  {
    id: 'demis-hassabis',
    title: 'Demis Hassabis',
    content: `Demis Hassabis is the CEO and co-founder of [[DeepMind]], the Google AI research lab. He led the development of AlphaGo, AlphaFold, and [[Gemini]]. Hassabis won the Nobel Prize in Chemistry 2024 for AlphaFold's protein structure prediction. He co-founded DeepMind in 2010 with Shane Legg and Mustafa Suleyman. Hassabis has a PhD in cognitive neuroscience from UCL. He is considered one of the most influential AI researchers globally. #person #ceo #deepmind`,
  },
  {
    id: 'yann-lecun',
    title: 'Yann LeCun',
    content: `Yann LeCun is Chief AI Scientist at [[Meta AI]] and Turing Award winner. He pioneered convolutional neural networks (CNNs) and backpropagation techniques. LeCun advocates for open-source AI development, opposing closed models from [[OpenAI]] and [[Anthropic]]. He co-developed the LeNet architecture for digit recognition. Currently leads the Fundamental AI Research (FAIR) team at Meta. LeCun argues that large language models are insufficient for AGI and advocates for energy-based and world model approaches. #person #research #meta`,
  },
  {
    id: 'ilya-sutskever',
    title: 'Ilya Sutskever',
    content: `Ilya Sutskever is a co-founder of [[OpenAI]] and former Chief Scientist. He co-invented the AlexNet deep learning model with [[Andrej Karpathy]]'s mentor Geoffrey Hinton. Sutskever led the development of [[GPT-4]] and contributed to the original GPT series. In May 2024, he departed OpenAI to found Safe Superintelligence Inc (SSI) focused on safe AGI. Sutskever was central to the November 2023 board incident that temporarily removed [[Sam Altman]]. He has deep expertise in sequence-to-sequence models and neural machine translation. #person #research #openai`,
  },
  {
    id: 'andrej-karpathy',
    title: 'Andrej Karpathy',
    content: `Andrej Karpathy is a deep learning researcher and educator known for making neural networks accessible. He was founding member of [[OpenAI]] and later Director of AI at Tesla. Karpathy created neural network educational projects including micrograd, nanoGPT, and llm.c, built with [[PyTorch]]. He is known for his YouTube lectures on deep learning and [[Transformer Architecture]]. After Tesla, he returned to [[OpenAI]] briefly in 2023 before departing to focus on education. His tokenizer tutorials explain [[Embeddings]] and [[Attention Mechanism]] clearly. #person #education #pytorch`,
  },
  {
    id: 'arthur-mensch',
    title: 'Arthur Mensch',
    content: `Arthur Mensch is the CEO and co-founder of [[Mistral AI]], a French AI startup. Previously he was a research scientist at [[DeepMind]] working on large language models. Mensch co-authored the "Chinchilla" paper at DeepMind establishing compute-optimal scaling laws. He co-founded Mistral AI in 2023 with Guillaume Lample and Timothée Lacroix. Under his leadership, Mistral released [[Mistral 7B]] and Mixtral 8x7B. Mensch champions European AI sovereignty and open-weight model development. #person #ceo #mistral`,
  },
  {
    id: 'jeff-dean',
    title: 'Jeff Dean',
    content: `Jeff Dean is Chief Scientist at Google DeepMind. He co-created TensorFlow, Google's open-source deep learning framework, and designed the MapReduce distributed computing system. Dean led the development of the Transformer architecture at Google Brain. He contributed to Google Translate and other language AI systems. Dean is a Google Senior Fellow with deep expertise in large-scale distributed systems and machine learning infrastructure. He helped pioneer the use of TPUs (Tensor Processing Units) for neural network training. #person #google #infrastructure`,
  },
  {
    id: 'yoshua-bengio',
    title: 'Yoshua Bengio',
    content: `Yoshua Bengio is a deep learning pioneer and Turing Award winner (2018, shared with Hinton and LeCun). He is a professor at Université de Montréal and founder of Mila, the Quebec AI Institute. Bengio contributed foundational work on recurrent networks, attention mechanisms, and generative adversarial networks. He co-developed word2vec-style [[Embeddings]] and neural machine translation. Bengio is a strong AI safety advocate, signing open letters about AI risk. He supports AI governance and regulation. Uses [[TensorFlow]] and [[PyTorch]] for research. #person #research #safety`,
  },
  {
    id: 'fei-fei-li',
    title: 'Fei-Fei Li',
    content: `Fei-Fei Li is a professor at Stanford and co-director of Stanford HAI (Human-Centered AI). She created ImageNet, the large-scale visual recognition dataset that sparked the deep learning revolution. Li was Chief Scientist of AI at Google Cloud from 2017-2018. She founded AI4ALL, a nonprofit promoting diversity in AI education. Fei-Fei Li advocates for human-centered AI development and responsible deployment. Her work bridges computer vision and natural language processing. #person #vision #stanford`,
  },

  // ── Domain 4: ML Concepts (10 pages) ──────────────────────────────────────
  {
    id: 'transformer',
    title: 'Transformer Architecture',
    content: `The Transformer is a neural network architecture introduced in "Attention Is All You Need" (Vaswani et al., 2017). It replaces recurrent layers with the [[Attention Mechanism]], enabling parallel processing of sequences. Transformers are the foundation of all modern large language models including [[GPT-4]], [[Claude 3]], and [[Gemini]]. The architecture consists of encoder and decoder stacks with multi-head self-attention and feed-forward layers. [[PyTorch]] and [[TensorFlow]] both provide optimized Transformer implementations. Positional encodings enable sequence order awareness without recurrence. #architecture #deeplearning #attention`,
  },
  {
    id: 'rag',
    title: 'RAG (Retrieval-Augmented Generation)',
    content: `Retrieval-Augmented Generation (RAG) combines language models with external knowledge retrieval. Instead of relying solely on parametric memory, RAG queries a [[Vector Databases]] or document store at inference time. The retrieved context is injected into the prompt to ground generation in factual information. RAG reduces hallucination and enables knowledge updates without retraining. [[LangChain]] and [[LlamaIndex]] provide RAG pipeline frameworks. [[Embeddings]] are used to encode documents and queries for semantic similarity search. [[Command R+]] is specifically optimized for RAG workflows. #rag #retrieval #grounding`,
  },
  {
    id: 'rlhf',
    title: 'RLHF',
    content: `Reinforcement Learning from Human Feedback (RLHF) is a technique for aligning language models with human preferences. The process involves supervised [[Fine-tuning]], reward model training on human preference data, and PPO optimization. RLHF was used to train InstructGPT and is central to [[GPT-4]] and [[Claude 3]] alignment. [[Constitutional AI]] from [[Anthropic]] extends RLHF with AI-generated feedback (RLAIF). RLHF significantly improves helpfulness and reduces harmful outputs. The technique was pioneered by OpenAI researchers. #alignment #training #safety`,
  },
  {
    id: 'fine-tuning',
    title: 'Fine-tuning',
    content: `Fine-tuning adapts a pretrained language model to a specific task or domain using labeled data. Techniques include full fine-tuning, LoRA (Low-Rank Adaptation), and QLoRA for memory-efficient training. [[RLHF]] is a form of fine-tuning using human preference feedback. Parameter-efficient fine-tuning (PEFT) methods reduce the computational cost significantly. [[PyTorch]] and Hugging Face's PEFT library are primary tools for fine-tuning [[Llama 3]] and other open models. Instruction tuning adapts base models to follow instructions. [[Weights & Biases]] tracks fine-tuning experiments. #training #adaptation #peft`,
  },
  {
    id: 'vector-db',
    title: 'Vector Databases',
    content: `Vector databases store and retrieve high-dimensional [[Embeddings]] using approximate nearest neighbor (ANN) algorithms. Core operations: insert vectors, query by similarity (cosine, dot product, Euclidean). Popular systems include [[ChromaDB]], [[FAISS]], and [[Pinecone]]. PGlite with pgvector HNSW index provides embedded vector search. Vector databases power [[RAG (Retrieval-Augmented Generation)]] pipelines, semantic search, and recommendation systems. HNSW (Hierarchical Navigable Small World) is the standard ANN index offering sub-linear search. IVFFlat is an alternative for memory-constrained deployments. #vectordb #similarity #ann`,
  },
  {
    id: 'chain-of-thought',
    title: 'Chain of Thought',
    content: `Chain of Thought (CoT) prompting is a technique that improves language model reasoning by generating intermediate reasoning steps. Introduced by Wei et al. (2022), CoT significantly improves performance on math, logic, and multi-step problems. "Let's think step by step" is a simple zero-shot CoT prompt that enables reasoning in [[GPT-4]], [[Claude 3]], and other large models. Tree of Thought extends CoT to explore multiple reasoning paths. Self-consistency (multiple CoT paths + majority vote) further improves accuracy. CoT emerges in models with over ~100B parameters. #prompting #reasoning #emergent`,
  },
  {
    id: 'mixture-of-experts',
    title: 'Mixture of Experts',
    content: `Mixture of Experts (MoE) is a neural network architecture where different "expert" subnetworks specialize in processing different inputs. A learned gating mechanism routes each token to the top-k experts. MoE enables large model capacity with lower inference compute — [[Mistral 7B]]-based Mixtral 8x7B uses 2 of 8 experts per token. [[GPT-4]] reportedly uses a MoE architecture. [[Grok-1]] uses 8 experts with 2 active. [[Gemini]] 1.5 uses MoE for its 1M token context. [[PyTorch]] supports custom MoE implementations. #architecture #efficiency #scaling`,
  },
  {
    id: 'constitutional-ai',
    title: 'Constitutional AI',
    content: `Constitutional AI (CAI) is a technique developed by [[Anthropic]] for training helpful and harmless AI systems. A set of principles (the "constitution") guides the AI to critique and revise its own outputs. This enables AI feedback (RLAIF) to supplement human feedback in [[RLHF]]. CAI trained [[Claude 3]] to be harmless without sacrificing capability. [[Dario Amodei]] and Anthropic researchers published the Constitutional AI paper in 2022. CAI reduces reliance on human labelers for safety feedback and scales alignment training. #safety #alignment #anthropic`,
  },
  {
    id: 'embeddings',
    title: 'Embeddings',
    content: `Embeddings are dense vector representations of text, images, or other data in a continuous semantic space. Similar items have nearby embeddings (high cosine similarity). Text embeddings are produced by encoder models like OpenAI text-embedding-3, Cohere Embed, and open models like nomic-embed. Embeddings power [[RAG (Retrieval-Augmented Generation)]], semantic search, [[Vector Databases]], and clustering. [[Andrej Karpathy]] popularized embedding visualization techniques. Word2Vec and GloVe were early word embedding techniques precursors to contextual embeddings. Embedding dimensions range from 128 to 3072. #embeddings #representation #semantic`,
  },
  {
    id: 'attention-mechanism',
    title: 'Attention Mechanism',
    content: `The Attention Mechanism allows neural networks to focus on relevant parts of the input when producing output. Self-attention computes query, key, and value projections from the same sequence, enabling each token to attend to all others. Multi-head attention runs multiple attention heads in parallel, capturing different relationships. [[Andrej Karpathy]]'s nanoGPT implements [[Transformer Architecture]] attention from scratch using [[PyTorch]]. Flash Attention is an optimized GPU implementation that reduces memory usage. Attention is the core innovation enabling modern large language models like [[GPT-4]] and [[Claude 3]]. #attention #transformer #deeplearning`,
  },

  // ── Domain 5: Developer Tools (10 pages) ──────────────────────────────────
  {
    id: 'pytorch',
    title: 'PyTorch',
    content: `PyTorch is an open-source machine learning framework developed by [[Meta AI]] and widely used for deep learning research and production. It provides dynamic computation graphs, automatic differentiation, and GPU acceleration via CUDA. [[Andrej Karpathy]] uses PyTorch for all educational neural network projects including nanoGPT and micrograd. PyTorch is used to train and fine-tune [[Llama 3]], [[Mistral 7B]], and other open models. The Hugging Face [[Transformer Architecture]] library is built on PyTorch. [[Yoshua Bengio]]'s Mila research group extensively uses PyTorch. #framework #deeplearning #python`,
  },
  {
    id: 'tensorflow',
    title: 'TensorFlow',
    content: `TensorFlow is an open-source machine learning framework developed by [[Jeff Dean]] and Google Brain. It was the dominant deep learning framework before [[PyTorch]]'s rise in research. TensorFlow 2.x introduced Keras as the default high-level API and eager execution. TensorFlow Serving enables production model deployment. Google uses TensorFlow internally for [[Gemini]] training infrastructure. [[Yoshua Bengio]] and academic researchers increasingly favor [[PyTorch]] over TensorFlow. TensorFlow Lite enables on-device inference for mobile. #framework #deeplearning #google`,
  },
  {
    id: 'langchain',
    title: 'LangChain',
    content: `LangChain is an open-source framework for building applications with large language models. It provides abstractions for chains, agents, memory, and [[RAG (Retrieval-Augmented Generation)]] pipelines. LangChain supports [[OpenAI]], [[Anthropic]], and open-source LLMs via a unified interface. It integrates with [[Vector Databases]] including [[ChromaDB]], [[FAISS]], and [[Pinecone]] for document retrieval. [[LlamaIndex]] is a competing framework focused specifically on data indexing and RAG. LangSmith provides tracing and evaluation tools. LangGraph supports stateful multi-actor agent workflows. #framework #llm #agents`,
  },
  {
    id: 'llamaindex',
    title: 'LlamaIndex',
    content: `LlamaIndex (formerly GPT Index) is a framework for connecting LLMs with external data sources. Specializes in data ingestion, indexing, and [[RAG (Retrieval-Augmented Generation)]] workflows. Supports 160+ data source connectors including PDFs, databases, and APIs. LlamaIndex integrates with [[Vector Databases]] (ChromaDB, [[FAISS]], [[Pinecone]]) and LLMs ([[OpenAI]], [[Anthropic]], [[Ollama]]). Provides query engines, chat engines, and agent tools. [[LangChain]] is the main competitor. LlamaIndex's query pipeline enables complex RAG architectures. Powered by [[Embeddings]] for semantic retrieval. #framework #rag #indexing`,
  },
  {
    id: 'ollama',
    title: 'Ollama',
    content: `Ollama is an open-source tool for running large language models locally on macOS, Linux, and Windows. It provides a simple CLI and REST API for downloading and running models including [[Llama 3]], [[Mistral 7B]], and [[Phi-3]]. Ollama handles model quantization and GPU/CPU inference automatically. [[vLLM]] is an alternative optimized for high-throughput server deployments. Ollama integrates with [[LangChain]] and [[LlamaIndex]] via the Ollama API. Local inference with Ollama eliminates API costs and keeps data private. [[Andrej Karpathy]] recommends Ollama for local LLM experimentation. #localai #inference #privacy`,
  },
  {
    id: 'vllm',
    title: 'vLLM',
    content: `vLLM is an open-source library for fast and efficient LLM inference and serving. It achieves high throughput through PagedAttention, which manages GPU memory for the KV cache efficiently. vLLM supports continuous batching, tensor parallelism, and speculative decoding. Compatible with [[Llama 3]], [[Mistral 7B]], [[Falcon 180B]], and other [[Transformer Architecture]] models. [[Ollama]] is simpler for local use; vLLM is designed for production serving of multiple concurrent users. vLLM exposes an OpenAI-compatible API. [[Weights & Biases]] monitors vLLM serving performance. #inference #serving #efficiency`,
  },
  {
    id: 'chromadb',
    title: 'ChromaDB',
    content: `ChromaDB is an open-source [[Vector Databases]] for AI applications. It provides a simple Python and JavaScript API for storing and querying [[Embeddings]]. ChromaDB runs embedded in-process or as a persistent server. Supports metadata filtering alongside vector similarity search. Used in [[RAG (Retrieval-Augmented Generation)]] pipelines with [[LangChain]] and [[LlamaIndex]]. ChromaDB uses HNSW index for fast approximate nearest neighbor search. Alternatives include [[FAISS]] (Facebook), [[Pinecone]] (managed cloud), and pgvector. Stores embeddings from [[OpenAI]], [[Cohere]], and local models. #vectordb #embeddings #rag`,
  },
  {
    id: 'faiss',
    title: 'FAISS',
    content: `FAISS (Facebook AI Similarity Search) is a library for efficient similarity search and clustering of dense [[Embeddings]], developed by [[Meta AI]]. It provides fast nearest neighbor search at billion-vector scale using GPU acceleration. FAISS implements IVF, HNSW, PQ (product quantization), and other ANN indexes. Used in [[RAG (Retrieval-Augmented Generation)]] pipelines via [[LangChain]] and [[LlamaIndex]]. [[ChromaDB]] and [[Pinecone]] build on or compete with FAISS. FAISS is the standard benchmark for [[Vector Databases]] performance. Available for [[PyTorch]] integration. #vectordb #similarity #search`,
  },
  {
    id: 'pinecone',
    title: 'Pinecone',
    content: `Pinecone is a managed cloud [[Vector Databases]] service optimized for production AI applications. It provides fully managed HNSW-based vector similarity search with high availability and scalability. Pinecone supports hybrid search combining [[Embeddings]] with metadata filtering. Used in production [[RAG (Retrieval-Augmented Generation)]] systems with [[LangChain]] and [[LlamaIndex]]. Unlike [[ChromaDB]] and [[FAISS]], Pinecone is a SaaS product with pay-as-you-go pricing. Supports namespaces for multi-tenant data isolation. Integrates with [[OpenAI]] and [[Cohere]] embedding APIs. #vectordb #managed #production`,
  },
  {
    id: 'weights-biases',
    title: 'Weights & Biases',
    content: `Weights & Biases (W&B) is an MLOps platform for experiment tracking, model monitoring, and dataset management. It provides real-time visualization of training metrics for [[PyTorch]] and [[TensorFlow]] models. W&B Sweeps automates hyperparameter search for [[Fine-tuning]] and pretraining runs. Used by [[Meta AI]], [[Anthropic]], and major AI labs to track [[Llama 3]], [[Mistral 7B]], and other model training. W&B Artifacts versions datasets and model checkpoints. Integrates with [[vLLM]] for serving monitoring. Popular in academic research alongside industry. #mlops #tracking #experiments`,
  },
]
