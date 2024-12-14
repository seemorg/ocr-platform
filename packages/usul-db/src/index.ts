interface PublicationDetails {
  investigator?: string;
  publisher?: string;
  publisherLocation?: string;
  editionNumber?: string;
  publicationYear?: string; // hijri
}

type SplitsData = { start: number; end: number }[];

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace PrismaJson {
    type BookVersion = (
      | {
          source: "external";
        }
      | {
          source: "openiti" | "turath";
          pdfUrl?: string;
          splitsData?: SplitsData;
        }
      | {
          source: "pdf";
          ocrBookId?: string;
          splitsData?: SplitsData;
        }
    ) & {
      id: string;
      value: string;
      publicationDetails?: PublicationDetails;
      aiSupported?: boolean;
      keywordSupported?: boolean;
    };

    interface AuthorExtraProperties {
      _airtableReference?: string;
    }

    interface BookExtraProperties {
      _airtableReference?: string;
    }

    type BookPhysicalDetails = (
      | {
          type: "manuscript";
        }
      | ({
          type: "published";
        } & PublicationDetails)
    ) & {
      notes?: string;
    };

    interface GenreExtraProperties {
      _airtableReference?: string;
    }

    interface AdvancedGenreExtraProperties {
      _airtableReference?: string;
      simpleGenreId?: string; // id in Genres table
    }
  }
}

export * from "@usul-ocr/client/usul-db";
