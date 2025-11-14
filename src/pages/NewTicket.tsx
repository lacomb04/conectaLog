import React from 'react'
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Button,
  VStack,
  Heading,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react'

const NewTicket: React.FC = () => {
  const toast = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: 'Chamado criado',
      description: 'Seu chamado foi registrado com sucesso.',
      status: 'success',
      duration: 3000,
    })
  }

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>Novo Chamado</Heading>
      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={6} bg="white" p={6} borderRadius="lg" shadow="sm">
          <SimpleGrid columns={2} spacing={6} w="full">
            <FormControl isRequired>
              <FormLabel>Título</FormLabel>
              <Input placeholder="Resumo do problema" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Categoria</FormLabel>
              <Select placeholder="Selecione a categoria">
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="rede">Rede</option>
                <option value="acesso">Acesso</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <FormControl isRequired>
            <FormLabel>Descrição</FormLabel>
            <Textarea
              placeholder="Descreva o problema em detalhes"
              minH="200px"
            />
          </FormControl>

          <SimpleGrid columns={2} spacing={6} w="full">
            <FormControl isRequired>
              <FormLabel>Prioridade</FormLabel>
              <Select>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Departamento</FormLabel>
              <Select placeholder="Selecione o departamento">
                <option value="ti">TI</option>
                <option value="rh">RH</option>
                <option value="financeiro">Financeiro</option>
                <option value="operacional">Operacional</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          <Button
            colorScheme="blue"
            size="lg"
            width="full"
            type="submit"
          >
            Criar Chamado
          </Button>
        </VStack>
      </Box>
    </Box>
  )
}

export default NewTicket
