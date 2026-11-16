CREATE TABLE document_counters (document_type TEXT NOT NULL, local_day TEXT NOT NULL, sequence INTEGER NOT NULL CHECK(sequence > 0), PRIMARY KEY(document_type,local_day));
