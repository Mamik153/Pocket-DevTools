# Contributing to Markdown TTS Studio

Thanks for your interest in contributing.

## Ways to Contribute

- Report bugs
- Propose new features
- Improve documentation
- Submit fixes and enhancements

## Development Setup

1. Start the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./dev.sh
```

2. Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

3. Confirm backend health:

```bash
curl http://localhost:8000/health
```

## Pull Request Process

1. Keep pull requests focused on one change.
2. Add or update docs when behavior changes.
3. If you add/update a frontend tool, keep `frontend/src/config/tools.ts`, `frontend/src/router.tsx`, and `README.md` in sync.
4. If you add/update home-page resource links, update `frontend/src/config/resources.ts` and `README.md`.
5. Include steps to test your change.
6. Verify frontend build passes:

```bash
cd frontend
npm run build
```

7. For backend changes, verify the modified endpoint(s) locally and include request/response examples when relevant.

## Commit Guidance

- Write clear commit messages that describe what changed and why.
- Reference related issues in your PR description.

## Code Style

- Frontend: TypeScript + React conventions already used in `frontend/src`.
- Backend: follow current Python style in `backend/app`.
- Prefer small, readable functions and explicit error handling.

## Questions

If you are not sure where to start, open a feature request or discussion with your idea and proposed approach.
