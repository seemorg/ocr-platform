interface PublicationDetails {
  investigator?: string;
  publisher?: string;
  publisherLocation?: string;
  editionNumber?: string;
  publicationYear?: number; // hijri
}

type SplitsData = { start: number; end: number }[];

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace PrismaJson {
    type BookVersion =
      | {
          source: "openiti" | "turath" | "external";
          value: string;
          publicationDetails?: PublicationDetails;
        }
      | {
          source: "pdf";
          value: string;
          publicationDetails?: PublicationDetails;
          ocrBookId?: string;
          splitsData?: SplitsData;
        };

    interface BookFlags {
      aiSupported?: boolean;
      aiVersion?: string;
    }

    interface AuthorExtraProperties {
      _airtableReference?: string;
    }

    interface BookExtraProperties {
      physicalDetails?:
        | {
            type: "published";
            investigator?: string;
            publisher?: string;
            publisherLocation?: string;
            editionNumber?: string;
            publicationYear?: number; // hijri
          }
        | {
            type: "manuscript";
          };
      splitsData?: SplitsData;
      _airtableReference?: string;
    }

    interface GenreExtraProperties {
      _airtableReference?: string;
    }

    interface AdvancedGenreExtraProperties {
      _airtableReference?: string;
      simpleGenreId?: string; // id in Genres table
    }
  }
}

export * from "@usul-ocr/client/usul-db/index.js";
