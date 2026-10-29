import claimsJson from "../../content/claims.json";
import manifest from "../generated/manifest.json";

export type Claim = {
  n: number;
  kind: "system" | "method";
  dependsOn: number | null;
  paragraphs: string[];
  text: string;
  words: number;
};

export const CLAIMS = claimsJson.claims as Claim[];
export const TITLE = claimsJson.title;

export const claim = (n: number) => CLAIMS[n - 1];

export const hasAsset = (path: string) => (manifest.files as string[]).includes(path);

const SMALL = new Set(["a", "an", "and", "for", "of", "the", "to", "in", "on", "by", "or"]);

/** "SYSTEM AND METHOD FOR EDGE-BASED ..." → "System and Method for Edge-Based ..." */
export function titleCase(upper: string) {
  return upper
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i > 0 && SMALL.has(word)
        ? word
        : word
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("-"),
    )
    .join(" ");
}

export const APPLICANT = ["Bharati Vidyapeeth (Deemed to be University)", "College of Engineering, Pune"];
export const INVENTORS = ["Somil Agrawal", "Devendra Kumar Dewangan", "Abhishek Dixit", "Soumyadeep Biswas", "Akshat Mishra"];
