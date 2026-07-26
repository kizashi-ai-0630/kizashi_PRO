KIZASHI PRO 9.1 - STARTER FIX

1. Double-click start.bat.
2. Paste your OpenAI API key when asked, then press Enter.
3. The first launch installs packages automatically.
4. Wait for the browser to open at localhost:5173.

This version fixes the broken Japanese-encoded batch file.
The startup files now contain ASCII only, so Windows cmd can read them safely.

Security:
- The ZIP does not contain an API key.
- Your key is saved locally in .env.
- Never send or upload the .env file.
