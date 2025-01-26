import { createVersionId } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { DropzoneOptions } from "react-dropzone";

import { Button } from "./ui/button";
import { FileInput, FileUploader } from "./ui/file-upload";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type PublicationDetails = {
  investigator?: string;
  publisher?: string;
  publisherLocation?: string;
  editionNumber?: string;
  publicationYear?: string;
};

type Common = {
  id: string;
} & PublicationDetails;

type ExternalVersion = {
  type: "external";
  url: string;
} & Common;

type PdfVersion = {
  type: "pdf";
  mode: "upload" | "url";
  files: File[];
  url?: string;
  ocrBookId?: string;
} & Common;

type TurathVersion = {
  type: "turath";
  value: string;
  pdfUrl?: string;
  mode: "upload" | "url";
  files: File[];
} & Common;

type OpenitiVersion = {
  type: "openiti";
  value: string;
  pdfUrl?: string;
  mode: "upload" | "url";
  files: File[];
} & Common;

export type Version =
  | ExternalVersion
  | PdfVersion
  | TurathVersion
  | OpenitiVersion;

const MAX_FILE_SIZE_IN_MB = 300;
const dropzoneOptions = {
  accept: {
    "application/pdf": [".pdf"],
  },
  multiple: true,
  maxFiles: 30,
  maxSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024,
} satisfies DropzoneOptions;

export const makeVersionsInitialState = (): Version[] => {
  return [
    {
      id: createVersionId(),
      type: "pdf",
      mode: "upload",
      files: [],
    },
  ];
};

export default function VersionsInput({
  versions,
  setVersions,
  disabled,
}: {
  versions: Version[];
  setVersions: (versions: Version[]) => void;
  disabled?: boolean;
}) {
  const fieldChangeHandler = <
    T extends keyof ExternalVersion | keyof PdfVersion | keyof TurathVersion,
  >(
    idx: number,
    field: T,
    value: T extends keyof ExternalVersion
      ? ExternalVersion[T]
      : T extends keyof PdfVersion
        ? PdfVersion[T]
        : T extends keyof TurathVersion
          ? TurathVersion[T]
          : never,
  ) => {
    const newVersions = structuredClone(versions);
    (newVersions[idx] as any)![field]! = value;
    setVersions(newVersions);
  };

  const renderPublicationDetails = (idx: number) => {
    const version = versions[idx]!;

    return (
      <div className="mt-10">
        <h3 className="text-lg font-semibold">Publication Details</h3>
        <div className="mt-5 grid grid-cols-2 gap-10">
          <div className="space-y-2">
            <Label htmlFor={`version-${version.id}.investigator`}>
              Investigator (المحقق)
            </Label>
            <Input
              disabled={disabled}
              id={`version-${version.id}.investigator`}
              className="bg-white"
              value={version?.investigator}
              onChange={(e) =>
                fieldChangeHandler(idx, "investigator", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${version.id}.publisher`}>
              Publisher (دار النشر)
            </Label>
            <Input
              id={`version-${version.id}.publisher`}
              disabled={disabled}
              value={version?.publisher}
              className="bg-white"
              onChange={(e) =>
                fieldChangeHandler(idx, "publisher", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${version.id}.publisherLocation`}>
              Publisher Location (مدينة النشر)
            </Label>
            <Input
              id={`version-${version.id}.publisherLocation`}
              disabled={disabled}
              value={version?.publisherLocation}
              className="bg-white"
              onChange={(e) =>
                fieldChangeHandler(idx, "publisherLocation", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${version.id}.editionNumber`}>
              Edition Number (رقم الطبعة)
            </Label>
            <Input
              disabled={disabled}
              id={`version-${version.id}.editionNumber`}
              className="bg-white"
              value={version?.editionNumber}
              onChange={(e) =>
                fieldChangeHandler(idx, "editionNumber", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`version-${version.id}.publicationYear`}>
              Publication Year (سنة النشر)
            </Label>
            <Input
              disabled={disabled}
              id={`version-${version.id}.publicationYear`}
              type="text"
              className="bg-white"
              value={version?.publicationYear}
              onChange={(e) => {
                fieldChangeHandler(idx, "publicationYear", e.target.value);
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const addPdfVersion = () => {
    setVersions([
      ...versions,
      {
        id: createVersionId(),
        type: "pdf",
        mode: "upload",
        files: [],
      },
    ]);
  };

  const addExternalVersion = () => {
    setVersions([
      ...versions,
      {
        id: createVersionId(),
        type: "external",
        url: "",
      },
    ]);
  };

  const addTurathVersion = () => {
    setVersions([
      ...versions,
      {
        id: createVersionId(),
        type: "turath",
        value: "",
        mode: "upload",
        files: [],
      },
    ]);
  };

  const removeVersion = (id: string) => {
    setVersions(versions.filter((version) => version.id !== id));
  };

  const renderPdfInput = (idx: number, fieldName: string) => {
    const version = versions[idx]! as
      | PdfVersion
      | TurathVersion
      | OpenitiVersion;
    const mode = version.mode;
    const files = version.files;

    let pdfFieldName;
    let pdfUrl;
    if (version.type === "pdf") {
      pdfFieldName = "url";
      pdfUrl = version.url;
    } else {
      pdfFieldName = "pdfUrl";
      pdfUrl = version.pdfUrl;
    }

    return (
      <>
        <div className="flex items-center gap-2">
          <Label
            className="text-lg font-semibold"
            htmlFor={`version.${version.id}.${fieldName}`}
          >
            PDF
          </Label>

          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={() =>
              fieldChangeHandler(
                idx,
                "mode",
                mode === "upload" ? "url" : "upload",
              )
            }
            disabled={disabled}
          >
            {mode === "upload" ? "Mode: Upload" : "Mode: URL"}
          </Button>
        </div>

        <div>
          {mode === "upload" ? (
            <>
              {files.length > 0 ? (
                <div className="my-4 flex flex-col">
                  {files.map((file, idx) => (
                    <div key={idx}>
                      <span className="flex-shrink-0">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>

                      <Button
                        type="button"
                        onClick={() => {
                          const newFiles = files.filter(
                            (f, fIdx) => fIdx !== idx,
                          );
                          fieldChangeHandler(idx, "files", newFiles);
                        }}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              <FileUploader
                id={`version.${version.id}.${fieldName}`}
                value={files}
                onValueChange={(files) =>
                  fieldChangeHandler(idx, "files", files ?? [])
                }
                dropzoneOptions={{
                  ...dropzoneOptions,
                  disabled,
                }}
              >
                <FileInput>
                  <div className="mt-4 flex h-32 w-full items-center justify-center rounded-md border bg-background">
                    <p className="text-gray-400">Drop files here</p>
                  </div>
                </FileInput>
              </FileUploader>
            </>
          ) : (
            <div className="mt-4">
              <Input
                id={`version.${version.id}.${fieldName}`}
                placeholder="Enter PDF Url"
                className="bg-white"
                type="url"
                value={pdfUrl ?? ""}
                onChange={(e) =>
                  fieldChangeHandler(idx, pdfFieldName as any, e.target.value)
                }
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold">Versions</h2>

        <div className="mt-5 flex flex-col gap-5">
          {versions.map((version, idx) => {
            let content;
            if (version.type === "turath" || version.type === "openiti") {
              content = (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`version-${version.id}.value`}
                        className="text-lg font-semibold"
                      >
                        {version.type === "turath" ? "Turath" : "Openiti"}
                      </Label>

                      {version.type === "turath" && version.value && (
                        <a
                          href={`https://app.turath.io/book/${version.value}`}
                          target="_blank"
                          className="text-sm text-primary underline"
                        >
                          View on turath
                        </a>
                      )}
                    </div>

                    <Input
                      disabled={version.type === "openiti"}
                      id={`version-${version.id}.value`}
                      className="bg-white"
                      value={version.value}
                      onChange={(e) =>
                        fieldChangeHandler(idx, "value", e.target.value)
                      }
                    />
                  </div>

                  <div className="mt-10">{renderPdfInput(idx, "pdfUrl")}</div>
                </>
              );
            }

            if (version.type === "external") {
              content = (
                <>
                  <div className="space-y-4">
                    <Label
                      htmlFor={`version-${version.id}.url`}
                      className="text-lg font-semibold"
                    >
                      External Digitized Book URL
                    </Label>

                    <Input
                      disabled={disabled}
                      id={`version-${version.id}.url`}
                      className="bg-white"
                      value={version.url}
                      onChange={(e) =>
                        fieldChangeHandler(idx, "url", e.target.value)
                      }
                    />
                  </div>
                </>
              );
            }

            if (version.type === "pdf") {
              content = renderPdfInput(idx, "input");
            }

            return (
              <div
                className="relative rounded-md bg-gray-50 px-8 py-4"
                key={version.id}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  disabled={disabled}
                  onClick={() => removeVersion(version.id)}
                >
                  <XIcon className="size-4" />
                </Button>

                {content}
                {renderPublicationDetails(idx)}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={addPdfVersion}
            disabled={disabled}
          >
            Add PDF Version
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={addExternalVersion}
            disabled={disabled}
          >
            Add External Version
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={addTurathVersion}
            disabled={disabled}
          >
            Add Turath Version
          </Button>
        </div>
      </div>
    </div>
  );
}
