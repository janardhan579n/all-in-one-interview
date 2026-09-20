package com.learningplatform.common;

/** Thrown when a content id or user-data row does not exist. Mapped to HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String type, String id) {
        return new NotFoundException("No " + type + " with id '" + id + "'");
    }
}
