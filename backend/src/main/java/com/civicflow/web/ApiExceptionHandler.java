package com.civicflow.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ErrorBody(int status, String code, String message, Map<String, Object> details) {
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorBody> handle(ApiException e) {
        return ResponseEntity.status(e.getStatus())
                .body(new ErrorBody(e.getStatus().value(), e.getCode(), e.getMessage(), e.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException e) {
        Map<String, Object> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.put(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(new ErrorBody(400, "VALIDATION_FAILED", "Please correct the highlighted fields", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorBody> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorBody(400, "VALIDATION_FAILED", "Malformed request body", null));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorBody> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(new ErrorBody(400, "VALIDATION_FAILED", e.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleUnexpected(Exception e) {
        // Spring MVC errors (unknown route 404, wrong method 405, missing param 400) carry their own status
        if (e instanceof ErrorResponse er) {
            int status = er.getStatusCode().value();
            String code = HttpStatus.valueOf(status).name();
            return ResponseEntity.status(status).body(new ErrorBody(status, code, er.getBody().getDetail(), null));
        }
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody(500, "INTERNAL_ERROR", "Unexpected server error", null));
    }
}
