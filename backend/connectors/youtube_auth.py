"""One-time OAuth helper: obtain a YouTube refresh token.

Usage (after filling YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env):
    python -m connectors.youtube_auth

Opens a browser, asks you to authorize your own channel, then prints the
refresh token to paste into .env as YOUTUBE_REFRESH_TOKEN.
"""
from __future__ import annotations

import httpx

from backend.core.config import settings

REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"
SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def main() -> None:
    if not settings.has_youtube_oauth():
        print("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first.")
        return

    print("1. Open this URL in a browser and authorize access:\n")
    print(
        f"{AUTH_URL}?client_id={settings.youtube_client_id}"
        f"&redirect_uri={REDIRECT_URI}&response_type=code&scope={SCOPE}"
        "&access_type=offline&prompt=consent\n"
    )
    code = input("2. Paste the authorization code here: ").strip()

    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": settings.youtube_client_id,
            "client_secret": settings.youtube_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"Token exchange failed ({resp.status_code}): {resp.text}")
        return

    refresh_token = resp.json().get("refresh_token")
    if not refresh_token:
        print("No refresh token returned — re-run and make sure 'prompt=consent' is shown.")
        return

    print("\nSuccess! Add this to .env:\n")
    print(f"YOUTUBE_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    main()
