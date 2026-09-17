export function createState(client) {
  let generation=0;
  const state={value:{items:[],loading:false,error:null},async load(query,options={}){
    const current=++generation,quiet=!!options.quiet;
    if(quiet)state.value={...state.value,error:null};
    else state.value={...state.value,loading:true,error:null};
    try {const result=await client.list(query);if(current===generation)state.value={...state.value,...result,loading:false,error:null};}
    catch(error){if(current===generation)state.value={...state.value,loading:false,error:error.message};}
  }};return state;
}
