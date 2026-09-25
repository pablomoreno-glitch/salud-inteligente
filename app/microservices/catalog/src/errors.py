from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def install_error_handlers(app: FastAPI) -> None:
    """Make every error response look like ``{"error": "<mensaje en espanol>"}``."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict) and "error" in detail:
            body = detail
        else:
            body = {"error": detail}
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content={"error": _format_validation_message(exc)})


def _format_validation_message(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Los datos enviados no son validos"

    first = errors[0]
    field = ".".join(str(part) for part in first["loc"] if part != "body")
    message = first.get("msg", "valor invalido")

    if field:
        return f"El campo '{field}' no es valido: {message}"
    return message
