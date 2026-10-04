# MemoryBox

> A personal memory archive that lets you find moments by what they mean, not just by their filenames.

MemoryBox was built for a friend who wanted a simple way to keep meaningful photos and later find them without having to remember when or where they were saved.

Instead of relying only on folders, filenames, or exact keywords, MemoryBox uses open-source AI to understand uploaded images and turn them into searchable representations.

## Why MemoryBox?

Photos are easy to collect and surprisingly hard to remember later.

You might remember:

- "the day we went out"
- "that photo with the cats"
- "the night near the river"

But you probably don't remember the filename.

MemoryBox lets you search for the **meaning of a memory** using natural language.

## How it works

```text
                    Upload a photo
                          │
                          ▼
                ┌───────────────────┐
                │   Vision Model    │
                │ Qwen3-VL 2B       │
                └─────────┬─────────┘
                          │
                    AI description
                          │
                          ▼
                ┌───────────────────┐
                │ Embedding Model   │
                │ Qwen3-Embedding   │
                │      0.6B         │
                └─────────┬─────────┘
                          │
                     1024-D vector
                          │
                          ▼
                ┌───────────────────┐
                │   PostgreSQL      │
                │    + pgvector     │
                └─────────┬─────────┘

Search query
     │
     ▼
Embedding
     │
     ▼
Vector search ───────────────► Matching memories
Open-source AI at the core

AI is not an optional feature in MemoryBox.

The application uses open models for two core tasks.

Image understanding

Qwen/Qwen3-VL-2B-Instruct

The model analyzes each uploaded image and produces a concise description of its visual content.

Semantic embeddings

Qwen/Qwen3-Embedding-0.6B

The description is converted into a 1024-dimensional embedding.

These embeddings are stored in PostgreSQL using pgvector, allowing memories to be searched semantically.

This means a natural-language query can find memories based on their meaning rather than requiring an exact keyword match.

Tech stack
Backend
Java 25
Spring Boot
Spring Data JPA
PostgreSQL
pgvector
Hugging Face Inference API
Frontend
React
Vite
JavaScript
CSS
Infrastructure
Docker
Render
PostgreSQL
Features
Upload photos as memories
Add optional descriptions
Automatic AI image understanding
Semantic search using embeddings
PostgreSQL vector storage
REST API
Responsive web interface
Production deployment
Running locally
Requirements
Java 25
Maven
PostgreSQL with pgvector
Python 3
Node.js
Docker (optional)
Backend
./mvnw spring-boot:run

The backend runs on:

http://localhost:8080
Frontend
cd frontend
npm install
npm run dev

The frontend runs on:

http://localhost:5173
Environment variables

The backend requires:

SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
DB_PASSWORD
HF_TOKEN

Do not commit secrets or API tokens to the repository.

Project structure
memorybox/
├── src/
│   └── main/
│       └── java/
│           └── com/asna/memorybox/
├── frontend/
├── embedding_helper.py
├── Dockerfile
├── pom.xml
└── README.md
Why this project matters

MemoryBox started with a simple observation:

People don't organize memories the way databases do.

A database thinks in filenames, timestamps, and exact strings.

People remember scenes, people, places, and events.

MemoryBox uses semantic representations to bridge that gap.

That makes open-source AI useful for something personal and human rather than simply adding an AI chatbot to an application.

Built for Hacktoberfest

MemoryBox was created for the Hacktoberfest Weekend Challenge: Build for a Friend.

The project focuses on using open-source AI to solve a real problem for someone close to me: making personal memories easier to preserve and rediscover.

Demo

Live application:

https://memorybox-frontend.onrender.com/

Backend API:

https://memorybox-o9np.onrender.com/

License

This project is open source.
