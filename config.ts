import { createConfig , http} from "wagmi";
import { mainnet, base, basePreconf } from "viem/chains";


export const config = createConfig({
    chains:[base], 
    transports:{
        [base.id]: http(),
        
    }
})