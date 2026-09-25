from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI) -> None:
    """Normalize every error response to {"error": "<mensaje en español>"}."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, dict):
            body = {"error": detail.get("error", "Ocurrió un error.")}
            for key, value in detail.items():
                if key != "error":
                    body[key] = value
            return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)
        return JSONResponse(status_code=exc.status_code, content={"error": str(detail)}, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": "Los datos enviados no son válidos."})
