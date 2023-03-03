import {
  Agent,
  AutoAcceptCredential,
  InitConfig,
  HttpOutboundTransport,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
  ConsoleLogger,
  LogLevel,
} from "@aries-framework/core";
import { HttpInboundTransport, agentDependencies } from "@aries-framework/node";
import * as readline from "readline";
import { stdin as input, stdout as output } from "node:process";
import fetch from "node-fetch";

async function initAgent(): Promise<Agent> {
  const genesisTransactionsBCovrinTestNet = await (
    await fetch("http://test.bcovrin.vonx.io/genesis")
  ).text();

  // The agent initialization configuration
  const config: InitConfig = {
    label: "docs-nodejs-agent",
    walletConfig: {
      id: "wallet-id",
      key: "testkey0000000000000000000000000",
    },
    autoAcceptConnections: true,
    autoAcceptCredentials: AutoAcceptCredential.Always,
    endpoints: ["http://localhost:3001"],
    logger: new ConsoleLogger(LogLevel.debug),
    indyLedgers: [
      {
        id: "bcovrin-test-net",
        isProduction: false,
        indyNamespace: "bcovrin:test",
        genesisTransactions: genesisTransactionsBCovrinTestNet,
      },
    ],
  };

  // Creating an agent instance
  const agent = new Agent({
    config,
    dependencies: agentDependencies,
  });

  // Registering the required in- and outbound transports
  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 }));

  await agent.initialize().catch(console.error);

  return agent;
}

const setupConnectionListener = (
  agent: Agent,
  // outOfBandRecord: OutOfBandRecord,
  cb: (...args: any) => void
) => {
  agent.events.on<ConnectionStateChangedEvent>(
    ConnectionEventTypes.ConnectionStateChanged,
    ({ payload }) => {
      //   if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return;
      //   if (payload.connectionRecord.state === DidExchangeState.Completed) {
      //     // the connection is now ready for usage in other protocols!
      //     console.log(
      //       `Connection for out-of-band id ${outOfBandRecord.id} completed`
      //     );
      //     // Custom business logic can be included here
      //     // In this example we can send a basic message to the connection, but
      //     // anything is possible
      //     cb();
      //     // We exit the flow
      //     process.exit(0);
      //   }
      console.log("Connection event:", payload);
    }
  );
};

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(
    invitationUrl
  );

  return outOfBandRecord;
};

// Function to initialize the agent
const run = async () => {
  try {
    console.log("Initializing agent");

    const agent = await initAgent();
    console.log("Finished init");

    setupConnectionListener(agent, null!);

    const rl = readline.createInterface({
      input,
      output,
      terminal: true,
    });

    rl.on("line", async (line) => {
      console.log("Enter invitation");
      const oob = await receiveInvitation(agent, line);
      console.log(oob);
    });

    rl.once("close", () => {
      // end of input
    });
  } catch (err) {
    console.error("Caught error:", err);
  }

  console.log("Done");
};

export default run;
void run();
