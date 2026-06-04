class ApiException(Exception):
    """Excepción de dominio — produce la estructura de error estándar del spec."""

    def __init__(
        self,
        code: str,
        message: str,
        http_status: int,
        retriable: bool = False,
        existing_job_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.retriable = retriable
        self.existing_job_id = existing_job_id
