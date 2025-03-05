CREATE TABLE "DummyTable" (
                              "id" TEXT NOT NULL,
                              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "name" TEXT NOT NULL,

                              CONSTRAINT "DummyTable_pkey" PRIMARY KEY ("id")
);
