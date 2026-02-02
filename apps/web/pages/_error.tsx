import { NextPageContext } from "next";

function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>{statusCode || "An error occurred"}</h1>
      <p>
        {statusCode === 404
          ? "This page could not be found."
          : "An error occurred on the server."}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode: statusCode || 500 };
};

export default Error;
